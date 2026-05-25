const fs = require('fs');
const parser = require('C:/Users/Admin/Desktop/ai proctor/frontend/node_modules/@babel/parser');

try {
  const code = fs.readFileSync('frontend/src/pages/StudentsDashboard.jsx', 'utf8');
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('JSX parsed successfully');
} catch (err) {
  console.error('Error parsing JSX:', err.message);
  if (err.loc) {
    console.error(`At line ${err.loc.line}, column ${err.loc.column}`);
  }
}
