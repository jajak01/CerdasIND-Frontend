import React from 'react';

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ padding: '2rem' }}>
    <h1>{title}</h1>
    <p>This page is under construction.</p>
  </div>
);

export default Placeholder;
