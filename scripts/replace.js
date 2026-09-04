const fs = require('fs');
const files = [
  'src/app/(public)/page.tsx',
  'src/components/public/PublicHeader.tsx',
  'src/components/public/PublicFooter.tsx',
  'src/components/public/HeroCarousel.tsx'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let code = fs.readFileSync(f, 'utf8');
    code = code.replace(/href="#"/g, 'href="/info"');
    fs.writeFileSync(f, code);
    console.log('Updated ' + f);
  }
});
