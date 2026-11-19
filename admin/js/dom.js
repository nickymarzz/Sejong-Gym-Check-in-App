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

  function confirmModal({ title, message, confirmText = 'Confirm', confirmTone = 'primary' }) {
    return new Promise((resolve) => {
      const dialog = $('confirm-modal');
      const titleEl = $('confirm-modal-title');
      const descEl = $('confirm-modal-desc');
      const cancelBtn = $('confirm-modal-cancel');
      const actionBtn = $('confirm-modal-action');

      if (!dialog) {
        resolve(window.confirm(`${title}\n\n${message}`));
        return;
      }

      titleEl.textContent = title;
      descEl.textContent = message;
      actionBtn.textContent = confirmText;
      actionBtn.className = 'btn ' + (confirmTone === 'danger' ? 'btn-danger' : 'btn-primary');

      let resolved = false;

      function onConfirm() {
        if (resolved) return;
        resolved = true;
        cleanup();
        dialog.close();
        resolve(true);
      }

      function onCancel() {
        if (resolved) return;
        resolved = true;
        cleanup();
        dialog.close();
        resolve(false);
      }

      function onClose() {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(false);
      }

      function cleanup() {
        actionBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        dialog.removeEventListener('close', onClose);
        dialog.removeEventListener('cancel', onClose);
      }

      actionBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      dialog.addEventListener('close', onClose);
      dialog.addEventListener('cancel', onClose);

      dialog.showModal();
      cancelBtn.focus();
    });
  }

  SGC.dom = { $, setText, setLoading, element, fillTable, confirmModal };
}(window.SGC));
