/* ProBillar — login */
const HEADERS = { apikey: SB_KEY };

    // Mensaje si el panel expulsó la sesión
    (function showLoginMsg() {
      try {
        const msg = sessionStorage.getItem('probillar_login_msg');
        if (msg) {
          sessionStorage.removeItem('probillar_login_msg');
          const err = document.getElementById('error');
          if (err) {
            err.textContent = msg;
            err.classList.add('show');
          }
        }
      } catch (_) {}
    })();

    // No auto-entrar: siempre pedir usuario y contraseña (evita saltarse la validación)
    (function clearStaleHint() {
      try {
        // Sesión previa no omite el formulario; el panel revalidará tras login OK
      } catch (_) {}
    })();

    async function pingRoles() {
      try {
        const res = await fetch(SB_URL + '/roles?select=id_rol,nombre&order=id_rol.asc', { headers: HEADERS });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error API');
        document.getElementById('db-line').textContent =
          'BD OK · Roles: ' + data.map(r => r.nombre).join(', ');
      } catch (e) {
        document.getElementById('db-line').textContent = 'BD: ' + e.message;
        document.getElementById('db-line').style.color = 'var(--accent-red)';
      }
    }
    pingRoles();

    document.getElementById('login-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const err = document.getElementById('error');
      err.classList.remove('show');
      err.textContent = '';

      const usuario = document.getElementById('usuario').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('btn-login');
      btn.disabled = true;
      btn.textContent = 'Verificando…';

      try {
        const url = SB_URL + '/usuarios?select=id_usuario,nombre_completo,usuario,password_hash,id_rol,estado,roles(nombre)&usuario=eq.' + encodeURIComponent(usuario) + '&estado=eq.true';
        const res = await fetch(url, { headers: HEADERS });
        const rows = await res.json();
        if (!res.ok) throw new Error(rows.message || 'No se pudo consultar usuarios');

        if (!rows || !rows.length) {
          throw new Error('Usuario no encontrado o inactivo');
        }

        const u = rows[0];
        if (String(u.password_hash) !== String(password)) {
          throw new Error('Contraseña incorrecta');
        }

        const rolNombre = (u.roles && u.roles.nombre) ? u.roles.nombre : (
          u.id_rol === 1 ? 'Administrador' : u.id_rol === 2 ? 'Colaborador' : u.id_rol === 3 ? 'Cliente' : 'Desconocido'
        );

        const session = {
          id_usuario: u.id_usuario,
          usuario: u.usuario,
          nombre_completo: u.nombre_completo,
          id_rol: u.id_rol,
          rol: rolNombre,
          login_at: new Date().toISOString()
        };
        localStorage.setItem('probillar_session', JSON.stringify(session));
        window.location.href = 'mesaejemplo.html';
      } catch (ex) {
        err.textContent = ex.message || 'Error de login';
        err.classList.add('show');
        btn.disabled = false;
        btn.textContent = 'Entrar';
      }
    });
