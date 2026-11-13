/* ProBillar — clientes y usuarios */
async function loadClientes() {
      const tbody = document.getElementById('clientes-tbody');
      if (!tbody) return;
      try {
        const [rows, users] = await Promise.all([
          sb('/clientes?select=*&order=id_cliente.desc'),
          sb('/usuarios?select=usuario,nombre_completo,id_rol&id_rol=eq.3&estado=eq.true')
        ]);
        const userByName = {};
        (users || []).forEach(u => {
          if (u.nombre_completo) userByName[String(u.nombre_completo).toLowerCase()] = u.usuario;
        });
        tbody.innerHTML = '';
        (rows || []).forEach(c => {
          const login = userByName[String(c.nombre || '').toLowerCase()] || '—';
          tbody.innerHTML += `
            <tr>
              <td>${c.nombre || '—'}</td>
              <td>${login}</td>
              <td>${c.dni || '—'}</td>
              <td>${c.telefono || '—'}</td>
              <td>${c.es_vip ? '<span class="vip-tag">VIP</span>' : '—'}</td>
            </tr>`;
        });
        if (!rows || !rows.length) {
          tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted)">Sin clientes registrados</td></tr>';
        }
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:var(--accent-red)">${e.message}</td></tr>`;
      }
    }


    async function addCliente(event) {
      event.preventDefault();
      if (!isAdmin() && !isColaborador()) {
        alert('No tienes permiso para registrar clientes.');
        return;
      }
      const nombre = document.getElementById('cli-nombre').value.trim();
      const usuario = (document.getElementById('cli-usuario').value || '').trim().toLowerCase();
      const password_hash = (document.getElementById('cli-pass').value || '').trim();
      const dni = document.getElementById('cli-dni').value.trim() || null;
      const telefono = document.getElementById('cli-telefono').value.trim() || null;
      const es_vip = document.getElementById('cli-vip').value === 'true';
      if (!nombre || !usuario || !password_hash) {
        alert('Nombre, usuario y contraseña son obligatorios.');
        return;
      }
      try {
        // 1) Acceso de login (rol Cliente = 3)
        await sb('/usuarios', {
          method: 'POST',
          body: JSON.stringify({
            nombre_completo: nombre,
            usuario: usuario,
            password_hash: password_hash,
            id_rol: 3,
            estado: true
          })
        });
        // 2) Ficha de cliente
        await sb('/clientes', {
          method: 'POST',
          body: JSON.stringify({ nombre, dni, telefono, es_vip })
        });
        document.getElementById('form-cliente').reset();
        const passEl = document.getElementById('cli-pass');
        if (passEl) passEl.value = '1234';
        await loadClientes();
        alert('Cliente registrado.\nUsuario: ' + usuario + '\nContraseña: ' + password_hash + '\nPuede entrar al login con rol Cliente.');
      } catch (e) {
        alert('Error al registrar cliente: ' + e.message);
      }
    }

    // ---------- USUARIOS Admin/Colaborador (solo Administrador) ----------


    async function loadUsuarios() {
      const tbody = document.getElementById('usuarios-tbody');
      if (!tbody) return;
      try {
        const rows = await sb('/usuarios?select=id_usuario,nombre_completo,usuario,id_rol,estado,roles(nombre)&order=id_usuario.asc');
        tbody.innerHTML = '';
        (rows || []).forEach(u => {
          const rolNom = (u.roles && u.roles.nombre) ? u.roles.nombre : ('Rol ' + u.id_rol);
          let cls = 'role-tag-cli';
          if (u.id_rol === 1) cls = 'role-tag-admin';
          else if (u.id_rol === 2) cls = 'role-tag-colab';
          tbody.innerHTML += `
            <tr>
              <td>${u.nombre_completo || '—'}</td>
              <td>${u.usuario || '—'}</td>
              <td class="${cls}">${rolNom}</td>
              <td>${u.estado ? 'Activo' : 'Inactivo'}</td>
            </tr>`;
        });
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:var(--accent-red)">${e.message}</td></tr>`;
      }
    }


    async function addUsuario(event) {
      event.preventDefault();
      if (!isAdmin()) {
        alert('Solo el Administrador puede crear usuarios del sistema.');
        return;
      }
      const nombre_completo = document.getElementById('usr-nombre').value.trim();
      const usuario = document.getElementById('usr-usuario').value.trim().toLowerCase();
      const password_hash = document.getElementById('usr-pass').value;
      const id_rol = parseInt(document.getElementById('usr-rol').value, 10);
      if (!nombre_completo || !usuario || !password_hash) return;
      if (id_rol !== 1 && id_rol !== 2) {
        alert('Solo se pueden crear roles Administrador o Colaborador desde este panel.');
        return;
      }
      try {
        await sb('/usuarios', {
          method: 'POST',
          body: JSON.stringify({
            nombre_completo,
            usuario,
            password_hash,
            id_rol,
            estado: true
          })
        });
        document.getElementById('form-usuario').reset();
        document.getElementById('usr-pass').value = '1234';
        document.getElementById('usr-rol').value = '2';
        await loadUsuarios();
        alert('Usuario creado: ' + usuario + ' (rol ' + (id_rol === 1 ? 'Administrador' : 'Colaborador') + ')');
      } catch (e) {
        alert('Error al crear usuario: ' + e.message);
      }
    }
