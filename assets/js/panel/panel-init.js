/* ProBillar — arranque del panel */
window.onload = async () => {
  let ok = false;
  try {
    ok = await requireLogin();
  } catch (err) {
    console.error(err);
    ok = false;
    try { localStorage.removeItem('probillar_session'); } catch (_) {}
    window.location.replace('login.html');
    return;
  }
  if (!ok) return;
  try {
    if (canOperate()) {
      await ensureCajaAbierta();
    } else {
      const abiertas = await sb('/caja?estado=eq.Abierta&select=id_caja&order=id_caja.desc&limit=1');
      currentCajaId = (abiertas && abiertas[0]) ? abiertas[0].id_caja : null;
    }
    await loadFromDatabase();
    renderMap();
    if (canOperate()) {
      renderInventoryTable();
      renderQuickAddButtons();
      checkLowStockAlerts();
    } else if (isCliente()) {
      renderQuickAddButtons();
    }
    applyRolePermissions(currentSession.rol);
    if (currentTableId) selectPoolTable(currentTableId);
    setInterval(updateTimers, 1000);
    setInterval(() => { refreshTablesFromDb(true); }, 5000);
  } catch (e) {
    console.error(e);
    setDbStatus(false, e.message);
    alert('No se pudo conectar a Supabase: ' + e.message);
  }
};
