import React from 'react';
import logoImg from './logo.png'; 

export default function Logo() {
  return (
    <div className="logo-wrapper">
      <img src={logoImg} alt="Логотип" className="logo-image" />
    </div>
  );
}