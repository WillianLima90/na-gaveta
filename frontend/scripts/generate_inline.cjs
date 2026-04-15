// Script para gerar index_allinline.html com JS e CSS inline
// Usa split/join em vez de replace() para evitar o bug de substituição
// onde o texto de substituição contém a string buscada

const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '../dist');
const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

// Encontrar os arquivos gerados
const cssFile = fs.readdirSync(path.join(dist, 'assets')).find(f => f.endsWith('.css'));
const jsFile = fs.readdirSync(path.join(dist, 'assets')).find(f => f.endsWith('.js'));

if (!cssFile || !jsFile) {
  console.error('Arquivos CSS ou JS não encontrados em dist/assets/');
  process.exit(1);
}

console.log('CSS:', cssFile);
console.log('JS:', jsFile);

const css = fs.readFileSync(path.join(dist, 'assets', cssFile), 'utf8');
const js = fs.readFileSync(path.join(dist, 'assets', jsFile), 'utf8');

// Usar split/join para evitar o bug do String.replace() com $ no texto de substituição
// O texto de substituição (JS minificado) pode conter $& $1 $2 etc que são interpretados
// pelo replace() como referências ao padrão original

const cssTag = `<link rel="stylesheet" crossorigin href="/assets/${cssFile}">`;
const jsTag = `<script type="module" crossorigin src="/assets/${jsFile}"></script>`;

let result = indexHtml.split(cssTag).join(`<style>${css}</style>`);
result = result.split(jsTag).join(`<script type="module">${js}</script>`);

// Verificar que a substituição funcionou
if (result.includes(cssTag)) {
  console.error('ERRO: CSS tag não foi substituída');
  process.exit(1);
}
if (result.includes(jsTag)) {
  console.error('ERRO: JS tag não foi substituída');
  process.exit(1);
}

// Verificar que não há referências a /assets no head
const headEnd = result.indexOf('</head>');
const head = result.substring(0, headEnd);
const assetRefs = (head.match(/src="\/assets/g) || []).length;
if (assetRefs > 0) {
  console.warn(`AVISO: ${assetRefs} referências a /assets ainda no head`);
}

fs.writeFileSync(path.join(dist, 'index_allinline.html'), result, 'utf8');
const size = fs.statSync(path.join(dist, 'index_allinline.html')).size;
console.log(`\nindex_allinline.html gerado com sucesso`);
console.log(`Tamanho: ${Math.round(size / 1024)} KB`);
console.log(`Referências a /assets no head: ${assetRefs}`);
