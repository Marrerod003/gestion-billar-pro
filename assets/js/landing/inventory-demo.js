/* ProBillar — landing: mini inventario demo */
    // Inventario inicial de demostración
    let inventory = [
      { id: 1, name: "Cerveza Pilsen", category: "Bebidas", price: 8.00, stock: 45, minStock: 10 },
      { id: 2, name: "Agua Mineral 500ml", category: "Bebidas", price: 3.50, stock: 4, minStock: 10 },
      { id: 3, name: "Porción de Alitas", category: "Comidas", price: 22.00, stock: 12, minStock: 5 },
      { id: 4, name: "Tiza de Billar Master", category: "Accesorios", price: 2.50, stock: 3, minStock: 8 }
    ];

    document.addEventListener("DOMContentLoaded", () => {
      renderInventory();
    });

    function renderInventory() {
      const tbody = document.getElementById("inv-table-body");
      tbody.innerHTML = "";

      let totalVal = 0;
      let lowStockAlerts = 0;

      inventory.forEach(item => {
        const itemTotal = item.price * item.stock;
        totalVal += itemTotal;

        const isLow = item.stock <= item.minStock;
        if (isLow) lowStockAlerts++;

        const badgeClass = isLow ? "badge-low" : "badge-ok";
        const badgeText = isLow ? "Bajo Stock" : "Suficiente";

        tbody.innerHTML += `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.category}</td>
            <td>S/ ${item.price.toFixed(2)}</td>
            <td><strong>${item.stock}</strong> u.</td>
            <td><span class="badge-stock ${badgeClass}">${badgeText}</span></td>
            <td>
              <button class="btn-stock-action" onclick="changeStock(${item.id}, -1)">-</button>
              <button class="btn-stock-action" onclick="changeStock(${item.id}, 1)">+</button>
            </td>
            <td>
              <button class="btn-delete" onclick="deleteInventoryItem(${item.id})">Eliminar</button>
            </td>
          </tr>
        `;
      });

      // Actualizar Métricas
      document.getElementById("inv-total-items").innerText = inventory.length;
      document.getElementById("inv-total-val").innerText = `S/ ${totalVal.toFixed(2)}`;
      document.getElementById("inv-low-alerts").innerText = lowStockAlerts;
    }

    function addInventoryItem(event) {
      event.preventDefault();
      
      const name = document.getElementById("inv-name").value.trim();
      const category = document.getElementById("inv-cat").value;
      const price = parseFloat(document.getElementById("inv-price").value);
      const stock = parseInt(document.getElementById("inv-stock").value);
      const minStock = parseInt(document.getElementById("inv-min").value);

      if (name && !isNaN(price) && !isNaN(stock) && !isNaN(minStock)) {
        const newItem = {
          id: Date.now(),
          name,
          category,
          price,
          stock,
          minStock
        };

        inventory.push(newItem);
        renderInventory();

        // Limpiar Formulario
        document.getElementById("inv-add-form").reset();
      }
    }

    function changeStock(id, amount) {
      const item = inventory.find(i => i.id === id);
      if (item) {
        item.stock = Math.max(0, item.stock + amount);
        renderInventory();
      }
    }

    function deleteInventoryItem(id) {
      inventory = inventory.filter(i => i.id !== id);
      renderInventory();
    }
  
