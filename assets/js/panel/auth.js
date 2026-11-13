/* ProBillar — autenticación y roles */
(function immediateAuthGate() {
  try {
    const raw = localStorage.getItem('probillar_session');
    if (!raw) {
      window.location.replace('login.html');
      return;
    }
    const s = JSON.parse(raw);
    if (!s || !s.usuario || !s.id_usuario || !s.rol) {
      localStorage.removeItem('probillar_session');
      window.location.replace('login.html');
    }
  } catch (_) {
    try { localStorage.removeItem('probillar_session'); } catch (e) {}
    window.location.replace('login.html');
  }
})();


    function getSession() {
      try {
        const raw = localStorage.getItem('probillar_session');
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (_) { return null; }
    }


    function clearSessionAndGoLogin(msg) {
      try { localStorage.removeItem('probillar_session'); } catch (_) {}
      currentSession = null;
      if (msg) {
        try { sessionStorage.setItem('probillar_login_msg', msg); } catch (_) {}
      }
      window.location.replace('login.html');
    }


    function normalizeRol(name, idRol) {
      if (name && ROLES_VALIDOS.includes(name)) return name;
      if (idRol === 1) return 'Administrador';
      if (idRol === 2) return 'Colaborador';
      if (idRol === 3) return 'Cliente';
      return null;
    }

    /** Valida sesión local + usuario activo en BD. Obligatorio al entrar al panel. */


    async function requireLogin() {
      const local = getSession();
      if (!local || !local.usuario || !local.id_usuario) {
        clearSessionAndGoLogin('Debes iniciar sesión para entrar al sistema.');
        return false;
      }

      try {
        const rows = await sb(
          '/usuarios?select=id_usuario,nombre_completo,usuario,id_rol,estado,roles(nombre)' +
          '&id_usuario=eq.' + encodeURIComponent(local.id_usuario) +
          '&usuario=eq.' + encodeURIComponent(local.usuario) +
          '&estado=eq.true'
        );
        if (!rows || !rows.length) {
          clearSessionAndGoLogin('Sesión inválida o usuario inactivo. Vuelve a iniciar sesión.');
          return false;
        }
        const u = rows[0];
        const rolNombre = normalizeRol(
          (u.roles && u.roles.nombre) ? u.roles.nombre : local.rol,
          u.id_rol
        );
        if (!rolNombre) {
          clearSessionAndGoLogin('Tu cuenta no tiene un rol válido.');
          return false;
        }

        currentSession = {
          id_usuario: u.id_usuario,
          usuario: u.usuario,
          nombre_completo: u.nombre_completo,
          id_rol: u.id_rol,
          rol: rolNombre,
          login_at: local.login_at || new Date().toISOString(),
          validated_at: new Date().toISOString()
        };
        localStorage.setItem('probillar_session', JSON.stringify(currentSession));
        ID_USUARIO = currentSession.id_usuario;

        const badge = document.getElementById('session-badge');
        if (badge) {
          badge.textContent = currentSession.nombre_completo + ' · ' + currentSession.rol;
        }
        document.body.classList.remove('auth-pending');
        applyRolePermissions(currentSession.rol);
        return true;
      } catch (e) {
        console.error(e);
        clearSessionAndGoLogin('No se pudo validar el acceso: ' + (e.message || 'error de red'));
        return false;
      }
    }


    function logout() {
      clearSessionAndGoLogin(null);
    }


    function isAdmin() { return currentSession && currentSession.rol === 'Administrador'; }


    function isColaborador() { return currentSession && currentSession.rol === 'Colaborador'; }


    function isCliente() { return currentSession && currentSession.rol === 'Cliente'; }


    function canOperate() { return isAdmin() || isColaborador(); }

    /** Oculta todo lo sensible y solo abre lo permitido por rol */


    function applyRolePermissions(rol) {
      const cierre = document.getElementById('btn-cierre-caja');
      const invPanel = document.querySelector('.inventory-panel');
      const actionGroup = document.querySelector('.action-group');
      const quickAdd = document.getElementById('quick-add-container');
      const customForm = document.querySelector('.custom-item-form');
      const invForm = document.querySelector('.inv-form-inline');
      const panelClientes = document.getElementById('panel-clientes');
      const panelUsuarios = document.getElementById('panel-usuarios');
      const panel = document.querySelector('.panel');
      const btnCerrarMesa = document.getElementById('btn-cerrar-mesa');

      document.body.classList.remove('role-cliente', 'role-colaborador', 'role-admin');

      // Por defecto: cerrar áreas restringidas
      if (cierre) cierre.style.display = 'none';
      if (panelClientes) panelClientes.style.display = 'none';
      if (panelUsuarios) panelUsuarios.style.display = 'none';
      if (invPanel) invPanel.style.display = '';
      if (actionGroup) actionGroup.style.display = '';
      if (btnCerrarMesa) btnCerrarMesa.style.display = '';
      if (quickAdd) quickAdd.style.display = '';
      if (customForm) customForm.style.display = '';
      if (invForm) invForm.style.display = '';
      document.querySelectorAll('.section-title, .orders-list, .custom-item-form, .quick-add').forEach(el => {
        if (el) el.style.display = '';
      });

      if (rol === 'Cliente') {
        document.body.classList.add('role-cliente');
        // Cliente: ve mesas, pide productos y puede ABRIR mesas; no puede cerrarlas ni operar caja/inventario
        if (invPanel) invPanel.style.display = 'none';
        if (actionGroup) actionGroup.style.display = '';
        if (btnCerrarMesa) btnCerrarMesa.style.display = 'none';
        if (customForm) customForm.style.display = 'none';
        if (invForm) invForm.style.display = 'none';
        if (quickAdd) quickAdd.style.display = '';
        document.querySelectorAll('.section-title, .orders-list, .quick-add').forEach(el => {
          if (el) el.style.display = '';
        });
        document.querySelectorAll('.custom-item-form').forEach(el => {
          if (el) el.style.display = 'none';
        });
        // Cargar productos para poder pedir
        if (typeof renderQuickAddButtons === 'function') renderQuickAddButtons();
        if (typeof updatePanel === 'function') updatePanel();
      } else if (rol === 'Colaborador') {
        document.body.classList.add('role-colaborador');
        if (invForm) invForm.style.display = 'none'; // no crea productos
        if (panelClientes) {
          panelClientes.style.display = 'block';
          loadClientes();
        }
        // Sin cierre de caja ni alta de usuarios sistema
      } else if (rol === 'Administrador') {
        document.body.classList.add('role-admin');
        if (cierre) cierre.style.display = '';
        if (panelClientes) {
          panelClientes.style.display = 'block';
          loadClientes();
        }
        if (panelUsuarios) {
          panelUsuarios.style.display = 'block';
          loadUsuarios();
        }
      } else {
        clearSessionAndGoLogin('Rol no autorizado.');
      }
    }
