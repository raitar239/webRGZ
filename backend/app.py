from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import timedelta

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# Config
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///video_platform.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'super-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# --- Models -------------------------------------------------------------------

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    chat_name = db.Column(db.String(80))
    is_admin = db.Column(db.Boolean, default=False)

class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    filename = db.Column(db.String(256), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('video.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    likes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    user = db.relationship('User', backref='comments')

class CommentLike(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    comment_id = db.Column(db.Integer, db.ForeignKey('comment.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    __table_args__ = (db.UniqueConstraint('comment_id', 'user_id'),)

@app.route('/')
def index():
    return jsonify({'status': 'ok', 'message': 'API работает. Фронтенд: http://localhost:5173'})

# --- Auth Routes --------------------------------------------------------------

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not all(k in data for k in ['email', 'password', 'first_name', 'last_name']):
        return jsonify({'error': 'Missing required fields'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        first_name=data['first_name'],
        last_name=data['last_name'],
        chat_name=data.get('chat_name', data['first_name'])
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': token,
        'user': {'id': user.id, 'email': user.email, 'first_name': user.first_name,
                 'last_name': user.last_name, 'chat_name': user.chat_name, 'is_admin': user.is_admin}
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    if not user or not check_password_hash(user.password_hash, data.get('password', '')):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': token,
        'user': {'id': user.id, 'email': user.email, 'first_name': user.first_name,
                 'last_name': user.last_name, 'chat_name': user.chat_name, 'is_admin': user.is_admin}
    })

@app.route('/api/me', methods=['GET'])
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'id': user.id, 'email': user.email, 'first_name': user.first_name,
                    'last_name': user.last_name, 'chat_name': user.chat_name, 'is_admin': user.is_admin})

# --- Video Routes -------------------------------------------------------------

@app.route('/api/videos', methods=['GET'])
def get_videos():
    videos = Video.query.order_by(Video.created_at.desc()).all()
    return jsonify([{
        'id': v.id, 'title': v.title, 'description': v.description,
        'created_at': v.created_at.isoformat() if v.created_at else None
    } for v in videos])

@app.route('/api/videos/<int:video_id>', methods=['GET'])
def get_video(video_id):
    v = db.session.get(Video, video_id)
    if not v:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'id': v.id, 'title': v.title, 'description': v.description,
                    'created_at': v.created_at.isoformat() if v.created_at else None})

@app.route('/api/videos/<int:video_id>/stream', methods=['GET'])
def stream_video(video_id):
    video = db.session.get(Video, video_id)
    if not video:
        return jsonify({'error': 'Not found'}), 404
    path = os.path.join(app.config['UPLOAD_FOLDER'], video.filename)
    if not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404

    file_size = os.path.getsize(path)
    range_header = request.headers.get('Range', None)

    if not range_header:
        rv = Response(
            open(path, 'rb').read(),
            200,
            mimetype='video/mp4'
        )
        rv.headers['Content-Length'] = str(file_size)
        rv.headers['Accept-Ranges'] = 'bytes'
        return rv

    m = range_header.replace('bytes=', '').split('-')
    byte1 = int(m[0])
    byte2 = int(m[1]) if m[1].strip() else file_size - 1
    byte2 = min(byte2, file_size - 1)
    length = byte2 - byte1 + 1

    with open(path, 'rb') as f:
        f.seek(byte1)
        data = f.read(length)

    rv = Response(data, 206, mimetype='video/mp4', direct_passthrough=False)
    rv.headers['Content-Range'] = f'bytes {byte1}-{byte2}/{file_size}'
    rv.headers['Accept-Ranges'] = 'bytes'
    rv.headers['Content-Length'] = str(length)
    return rv

@app.route('/api/admin/videos', methods=['POST'])
@jwt_required()
def upload_video():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    title = request.form.get('title', 'Untitled')
    description = request.form.get('description', '')

    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    video = Video(title=title, filename=filename, description=description)
    db.session.add(video)
    db.session.commit()

    return jsonify({'id': video.id, 'title': video.title}), 201

@app.route('/api/admin/videos/<int:video_id>', methods=['DELETE'])
@jwt_required()
def delete_video(video_id):
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    video = db.session.get(Video, video_id)
    if not video:
        return jsonify({'error': 'Not found'}), 404
    path = os.path.join(app.config['UPLOAD_FOLDER'], video.filename)
    if os.path.exists(path):
        os.remove(path)

    Comment.query.filter_by(video_id=video_id).delete()
    db.session.delete(video)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

# --- Comment Routes -----------------------------------------------------------

@app.route('/api/videos/<int:video_id>/comments', methods=['GET'])
@jwt_required(optional=True)
def get_comments(video_id):
    user_id = get_jwt_identity()
    user_id = int(user_id) if user_id else None
    comments = Comment.query.filter_by(video_id=video_id).order_by(Comment.created_at.asc()).all()

    liked_ids = set()
    if user_id:
        liked = CommentLike.query.filter(
            CommentLike.user_id == user_id,
            CommentLike.comment_id.in_([c.id for c in comments])
        ).all()
        liked_ids = {l.comment_id for l in liked}

    return jsonify([{
        'id': c.id, 'text': c.text, 'likes': c.likes,
        'user_name': c.user.chat_name or c.user.first_name,
        'liked_by_me': c.id in liked_ids,
        'created_at': c.created_at.isoformat() if c.created_at else None
    } for c in comments])

@app.route('/api/videos/<int:video_id>/comments', methods=['POST'])
@jwt_required()
def post_comment(video_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get('text'):
        return jsonify({'error': 'Text required'}), 400

    comment = Comment(video_id=video_id, user_id=user_id, text=data['text'])
    db.session.add(comment)
    db.session.commit()

    user = db.session.get(User, user_id)
    return jsonify({
        'id': comment.id, 'text': comment.text, 'likes': 0,
        'user_name': user.chat_name or user.first_name,
        'created_at': comment.created_at.isoformat() if comment.created_at else None
    }), 201

@app.route('/api/comments/<int:comment_id>/like', methods=['POST'])
@jwt_required()
def like_comment(comment_id):
    user_id = int(get_jwt_identity())
    comment = db.session.get(Comment, comment_id)
    if not comment:
        return jsonify({'error': 'Not found'}), 404

    existing = CommentLike.query.filter_by(comment_id=comment_id, user_id=user_id).first()
    if existing:
        db.session.delete(existing)
        comment.likes = max(0, comment.likes - 1)
        liked = False
    else:
        like = CommentLike(comment_id=comment_id, user_id=user_id)
        db.session.add(like)
        comment.likes += 1
        liked = True

    db.session.commit()
    return jsonify({'likes': comment.likes, 'liked': liked})

# --- Init ---------------------------------------------------------------------

def create_admin():
    with app.app_context():
        db.create_all()
        if not User.query.filter_by(email='admin@admin.com').first():
            admin = User(
                email='admin@admin.com',
                password_hash=generate_password_hash('admin123'),
                first_name='Admin',
                last_name='',
                chat_name='Admin',
                is_admin=True
            )
            db.session.add(admin)
            db.session.commit()
            print("Admin created: admin@admin.com / admin123")

if __name__ == '__main__':
    create_admin()
    app.run(debug=True, port=5000)
