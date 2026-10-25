(function (SGC) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function setText(node, text) {
    node.textContent = text;
  }

  function setLoading(node, on) {
    node.classList.toggle('is-loading', on);
    node.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fillTable(container, columns, rows) {
    container.textContent = '';
    const table = document.createElement('table');
    const head = table.createTHead().insertRow();
    columns.forEach((col) => {
      const th = element('th', col.numeric ? 'num' : '', col.label);
      th.scope = 'col';
      head.appendChild(th);
    });
    const body = table.createTBody();
    rows.forEach((row) => {
      const tr = body.insertRow();
      columns.forEach((col) => {
        const td = tr.insertCell();
        if (col.numeric) td.className = 'num';
        const value = col.value(row);
        if (value instanceof Node) td.appendChild(value);
        else td.textContent = value;
      });
    });
    container.appendChild(table);
  }

  SGC.dom = { $, setText, setLoading, element, fillTable };
}(window.SGC));
