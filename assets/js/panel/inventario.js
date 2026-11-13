/* ProBillar — inventario y pedidos */
function checkLowStockAlerts() {
      const container = document.getElementById('notification-container');
      if (!container) return;
      container.innerHTML = '';
      inventory.forEach(item => {
        if (item.stock <= item.minStock) {
          const alertDiv = document.createElement('div');
          alertDiv.className = 'alert-banner';
          alertDiv.innerHTML = `
            <span>⚠️ <strong>¡ALERTA DE STOCK BAJO!</strong> El producto <strong>${item.name}</strong> tiene únicamente ${item.stock} unidades (Mínimo: ${item.minStock}).</span>
            <button onclick="modifyStock(${item.id}, 5)" style="background: var(--accent-gold); border:none; padding: 4px 8px; border-radius:4px; cursor:pointer; font-size: 0.8rem; font-weight:bold;">+ Renovar 5 u.</button>
          `;
          container.appendChild(alertDiv);
        }
      });
    }


    function canOrderProducts() {
      return isAdmin() || isColaborador() || isCliente();
    }


    async function addPresetItem(invId) {
      if (!canOrderProducts()) {
        alert('Tu rol no puede pedir productos.');
        return;
      }
      const invItem = inventory.find(i => i.id === invId);
      if (!invItem || invItem.stock <= 0) {
        alert('¡Aviso! No hay stock suficiente para este producto.');
        return;
      }
      const table = tables.find(t => t.id === currentTableId);
      if (!table) return;
      if (!table.active) {
        alert(isCliente()
          ? 'La mesa aún no está abierta. Pide al personal que la abra para poder ordenar.'
          : 'Abre la mesa antes de agregar consumos.');
        return;
      }

      try {
        if (!table.idSesion) {
          // Intentar recuperar sesión activa de BD
          const sesRows = await sb('/sesiones_juego?id_mesa=eq.' + table.id + '&estado=eq.Activa&select=id_sesion&order=id_sesion.desc&limit=1');
          if (sesRows && sesRows[0]) table.idSesion = sesRows[0].id_sesion;
        }
        if (!table.idSesion) {
          alert('No hay sesión activa en la base de datos para esta mesa. El personal debe abrir la mesa de nuevo.');
          return;
        }

        const newStock = invItem.stock - 1;
        await sb('/productos?id_producto=eq.' + invItem.id, {
          method: 'PATCH',
          body: JSON.stringify({ stock: newStock })
        });
        invItem.stock = newStock;
        invItem.soldToday++;

        // Guardar consumo en BD al instante (se refleja para admin/colaborador)
        const saved = await sb('/consumos_sesion', {
          method: 'POST',
          body: JSON.stringify({
            id_sesion: table.idSesion,
            id_producto: invItem.id,
            cantidad: 1,
            precio_unitario: invItem.price
          })
        });
        const idConsumo = saved && saved[0] ? saved[0].id_consumo : null;
        table.items.push({
          invId: invItem.id,
          name: invItem.name,
          price: invItem.price,
          idConsumo: idConsumo,
          cantidad: 1
        });
        if (canOperate()) {
          renderInventoryTable();
          checkLowStockAlerts();
        }
        renderQuickAddButtons();
        updatePanel();
      } catch (e) {
        alert('Error al registrar producto: ' + e.message);
      }
    }


    function addCustomItem() {
      alert('Los productos deben existir en la tabla productos de Supabase. Usa el inventario de la BD.');
    }


    async function removeItem(index) {
      if (isCliente()) {
        alert('Los clientes no pueden quitar productos. Solicita ayuda al personal.');
        return;
      }
      if (!canOperate()) {
        alert('Sin permiso para quitar productos.');
        return;
      }
      const table = tables.find(t => t.id === currentTableId);
      if (!table) return;
      const removedItem = table.items[index];
      if (removedItem && removedItem.invId) {
        const invItem = inventory.find(i => i.id === removedItem.invId);
        try {
          if (removedItem.idConsumo) {
            await sb('/consumos_sesion?id_consumo=eq.' + removedItem.idConsumo, { method: 'DELETE' });
          }
          if (invItem) {
            const newStock = invItem.stock + 1;
            await sb('/productos?id_producto=eq.' + invItem.id, {
              method: 'PATCH',
              body: JSON.stringify({ stock: newStock })
            });
            invItem.stock = newStock;
            invItem.soldToday = Math.max(0, invItem.soldToday - 1);
          }
        } catch (e) {
          alert('Error al quitar producto: ' + e.message);
          return;
        }
      }
      table.items.splice(index, 1);
      renderInventoryTable();
      renderQuickAddButtons();
      checkLowStockAlerts();
      updatePanel();
    }


    function renderQuickAddButtons() {
      const container = document.getElementById('quick-add-container');
      if (!container) return;
      container.innerHTML = '';
      inventory.forEach(item => {
        const disabled = item.stock <= 0 ? 'opacity:0.4;pointer-events:none;' : '';
        container.innerHTML += `
          <button class="btn-item" style="${disabled}" onclick="addPresetItem(${item.id})">
            <span>${item.name}</span>
            <small>Stock: ${item.stock} · $${item.price.toFixed(2)}</small>
          </button>
        `;
      });
    }


    function renderInventoryTable() {
      const tbody = document.getElementById('inventory-tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      inventory.forEach(item => {
        const low = item.stock <= item.minStock;
        tbody.innerHTML += `
          <tr>
            <td>${item.name}</td>
            <td>${item.category || '—'}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>${item.initialStock}</td>
            <td><strong>${item.soldToday}</strong></td>
            <td style="${low ? 'color:var(--accent-red);font-weight:700;' : ''}">${item.stock}</td>
            <td>${item.minStock}</td>
            <td>${low ? '⚠️ Bajo' : 'OK'}</td>
            <td>
              <button class="btn-stock-qty" onclick="modifyStock(${item.id}, -1)">−</button>
              <button class="btn-stock-qty" onclick="modifyStock(${item.id}, 1)">+</button>
              <button class="btn-stock-qty" onclick="modifyStock(${item.id}, 5)">+5</button>
            </td>
            <td>—</td>
          </tr>
        `;
      });
    }


    async function addNewStockItem(event) {
      if (!isAdmin()) {
        event.preventDefault();
        alert('Solo el Administrador puede crear productos.');
        return;
      }
      event.preventDefault();
      const name = document.getElementById('inv-new-name').value.trim();
      const price = parseFloat(document.getElementById('inv-new-price').value);
      const stock = parseInt(document.getElementById('inv-new-stock').value, 10);
      const min = parseInt(document.getElementById('inv-new-min').value, 10);
      if (!name || isNaN(price) || isNaN(stock) || isNaN(min)) return;
      try {
        const row = await sb('/productos', {
          method: 'POST',
          body: JSON.stringify({
            nombre: name,
            categoria: 'General',
            precio: price,
            stock: stock,
            stock_minimo: min
          })
        });
        const p = row[0];
        inventory.push({
          id: p.id_producto,
          name: p.nombre,
          category: p.categoria,
          price: Number(p.precio),
          stock: Number(p.stock),
          initialStock: Number(p.stock),
          soldToday: 0,
          minStock: Number(p.stock_minimo)
        });
        document.getElementById('inv-new-name').value = '';
        document.getElementById('inv-new-price').value = '';
        document.getElementById('inv-new-stock').value = '';
        document.getElementById('inv-new-min').value = '';
        renderInventoryTable();
        renderQuickAddButtons();
        checkLowStockAlerts();
      } catch (e) {
        alert('Error al crear producto en BD: ' + e.message);
      }
    }


    async function modifyStock(id, delta) {
      if (!isAdmin() && !isColaborador()) {
        alert('Sin permiso para ajustar stock.');
        return;
      }
      if (isColaborador() && delta < 0) {
        // colaborador puede descontar vía venta; ajuste manual + solo admin para crear, ok permitir +/-
      }
      const item = inventory.find(i => i.id === id);
      if (!item) return;
      const newStock = Math.max(0, item.stock + delta);
      try {
        await sb('/productos?id_producto=eq.' + id, {
          method: 'PATCH',
          body: JSON.stringify({ stock: newStock })
        });
        if (delta > 0) item.initialStock += delta;
        item.stock = newStock;
        renderInventoryTable();
        renderQuickAddButtons();
        checkLowStockAlerts();
      } catch (e) {
        alert('Error al actualizar stock: ' + e.message);
      }
    }


    function deleteStockItem(id) {
      alert('Eliminación de productos deshabilitada desde la demo para no borrar datos reales. Usa el SQL Editor de Supabase si hace falta.');
    }


    // ---------- CLIENTES (Colaborador + Admin) ----------
