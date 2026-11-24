// h('div', {class: 'x', onclick: fn}, 'texto', otroNodo, [lista], null)
export function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  agregar(el, hijos);
  return el;
}

function agregar(el, hijos) {
  for (const c of hijos.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function limpiar(el, ...hijos) {
  el.replaceChildren();
  agregar(el, hijos);
  return el;
}

let timer;
export function avisar(texto, tipo = 'ok') {
  let t = document.getElementById('aviso');
  if (!t) { t = h('div', { id: 'aviso', role: 'status' }); document.body.append(t); }
  t.textContent = texto;
  t.className = `aviso visible ${tipo}`;
  clearTimeout(timer);
  timer = setTimeout(() => t.classList.remove('visible'), 2600);
}

export function confirmar(texto, { aceptar = 'Sí', peligro = false } = {}) {
  return new Promise((resolver) => {
    const d = h('dialog', { class: 'confirmar' },
      h('p', {}, texto),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'btn', onclick: () => { d.close(); resolver(false); } }, 'Cancelar'),
        h('button', { type: 'button', class: `btn ${peligro ? 'peligro' : 'primario'}`, onclick: () => { d.close(); resolver(true); } }, aceptar)));
    d.addEventListener('close', () => { d.remove(); resolver(false); });
    document.body.append(d);
    d.showModal();
  });
}
