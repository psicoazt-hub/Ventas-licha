// SISTEMA LICHA V2.0 - BY ANTONIO ZAVALA TOLENTINO
let data = JSON.parse(localStorage.getItem('licha_master_v2')) || {
    usuario: null,
    entrada: null,
    stock: {}, // Estructura: { "Harina": { "0.5": 10, "1": 5 } }
    ventas: [],
    mermas: 0
};

function save() { localStorage.setItem('licha_master_v2', JSON.stringify(data)); }

function checkVista() {
    document.querySelectorAll('.seccion').forEach(s => s.classList.add('hidden'));
    if (!data.usuario) {
        document.getElementById('vista-identidad').classList.remove('hidden');
    } else if (!data.entrada) {
        document.getElementById('vista-principal').classList.remove('hidden');
        document.getElementById('txt-saludo').innerText = "Hola, " + data.usuario;
    } else {
        document.getElementById('vista-ventas').classList.remove('hidden');
        document.getElementById('info-user').innerText = data.usuario + " | Entrada: " + data.entrada;
        renderVentas();
    }
}

function configurarIdentidad() {
    const nom = document.getElementById('nombre-empleado-config').value;
    if (nom) { data.usuario = nom; save(); checkVista(); }
}

function checarEntrada() {
    data.entrada = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    save();
    checkVista();
}

function cargarStock() {
    const tipo = document.getElementById('tipo-prod-carga').value;
    const tam = document.getElementById('tamano-carga').value; // "0.5" o "1"
    const cant = parseInt(document.getElementById('cant-carga').value) || 0;

    if (!data.stock[tipo]) data.stock[tipo] = { "0.5": 0, "1": 0 };
    data.stock[tipo][tam] += cant;
    
    save();
    renderVentas();
    document.getElementById('cant-carga').value = "";
    alert("Cargado: " + cant + " paq de " + (tam == "1" ? "1kg" : "1/2kg") + " de " + tipo);
}

function calcularCobro() {
    const cant = parseFloat(document.getElementById('cant-venta').value) || 0;
    const modo = document.querySelector('input[name="modo-venta"]:checked').value;
    const precio = parseFloat(document.getElementById('precio-venta').value) || 0;

    // Si venden por Kilos, el precio unitario se multiplica x2 automáticamente
    let total = modo === 'kg' ? (precio * 2) * cant : precio * cant;
    document.getElementById('previo-cobro').innerText = "TOTAL A COBRAR: $" + total.toFixed(2);
}

function registrarVenta() {
    const prod = document.getElementById('prod-venta').value;
    const tamVenta = document.querySelector('input[name="tam-paq"]:checked').value; // Que paquete usan para surtir
    const cant = parseFloat(document.getElementById('cant-venta').value) || 0;
    const modo = document.querySelector('input[name="modo-venta"]:checked').value; // Paquete o Kilo
    const precio = parseFloat(document.getElementById('precio-venta').value) || 0;
    const tienda = document.getElementById('tienda-venta').value || "Público";

    // Lógica de descuento de inventario inteligente
    let cantDescontar = 0;
    if (modo === 'paq') {
        cantDescontar = cant;
    } else {
        // Venta por Kilo: si usan paq de medio descuenta 2, si usan de kilo descuenta 1
        cantDescontar = tamVenta === "0.5" ? cant * 2 : cant;
    }

    if (data.stock[prod][tamVenta] >= cantDescontar) {
        let subtotal = modo === 'kg' ? (precio * 2) * cant : precio * cant;
        data.ventas.push({ prod, cant, modo, tamUsado: tamVenta, precio, tienda, subtotal, hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
        data.stock[prod][tamVenta] -= cantDescontar;
        save();
        renderVentas();
        limpiarFormVenta();
    } else {
        alert("¡Inventario insuficiente! Solo hay " + data.stock[prod][tamVenta] + " paq de este tamaño.");
    }
}

function renderVentas() {
    const monitor = document.getElementById('monitor-stock');
    monitor.innerHTML = "<strong>STOCK EN CAMIONETA:</strong><br>";
    const select = document.getElementById('prod-venta');
    const actual = select.value;
    select.innerHTML = "";

    for (let p in data.stock) {
        monitor.innerHTML += `• ${p}: [1/2kg: ${data.stock[p]["0.5"]}] [1kg: ${data.stock[p]["1"]}]<br>`;
        select.innerHTML += `<option value="${p}">${p}</option>`;
    }
    if (actual) select.value = actual;
    actualizarInterfazVenta();

    const hist = document.getElementById('historial-ventas');
    hist.innerHTML = "<h3>Ventas Realizadas:</h3>";
    let totalEfectivo = 0;
    data.ventas.forEach(v => {
        totalEfectivo += v.subtotal;
        hist.innerHTML += `<div class="item-venta">${v.hora} - ${v.tienda}: ${v.cant}${v.modo} ${v.prod} ($${v.subtotal.toFixed(2)})</div>`;
    });
    hist.innerHTML += `<h2 style="color:#00ff00">EFECTIVO TOTAL: $${totalEfectivo.toFixed(2)}</h2>`;
}

function actualizarInterfazVenta() {
    const prod = document.getElementById('prod-venta').value;
    const contenedor = document.getElementById('opciones-tamano-venta');
    if (prod) {
        contenedor.innerHTML = `
            Usar paquetes de: 
            <label><input type="radio" name="tam-paq" value="0.5" checked> 1/2 kg</label>
            <label><input type="radio" name="tam-paq" value="1"> 1 kg</label>
        `;
    }
}

function limpiarFormVenta() {
    document.getElementById('cant-venta').value = "";
    document.getElementById('precio-venta').value = "";
    document.getElementById('tienda-venta').value = "";
    calcularCobro();
}

function borrarUltimaVenta() {
    if (data.ventas.length > 0 && confirm("¿Anular la última venta registrada?")) {
        const v = data.ventas.pop();
        let cantRegresar = (v.modo === 'kg' && v.tamUsado === "0.5") ? v.cant * 2 : v.cant;
        data.stock[v.prod][v.tamUsado] += cantRegresar;
        save();
        renderVentas();
    }
}

function confirmarSalida() {
    if (confirm("⚠️ ATENCIÓN: ¿Estás seguro de cerrar el día? Se generará el reporte final para WhatsApp.")) {
        enviarReporteWA();
        // Reset completo del día manteniendo usuario
        data.entrada = null;
        data.stock = {};
        data.ventas = [];
        save();
        location.reload();
    }
}

function enviarReporteWA() {
    let totalEfectivo = 0;
    let msg = `📦 *CORTE DE VENTAS - LICHA*%0A`;
    msg += `*Vendedor:* ${data.usuario}%0A`;
    msg += `*Entrada:* ${data.entrada}%0A*Salida:* ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}%0A---%0A`;
    
    msg += `*VENTAS POR RUTA:*%0A`;
    data.ventas.forEach(v => {
        msg += `• ${v.tienda}: ${v.cant}${v.modo} de ${v.prod} ($${v.subtotal.toFixed(2)})%0A`;
        totalEfectivo += v.subtotal;
    });

    msg += `---%0A*SOBRANTE EN CAMIONETA:*%0A`;
    for (let p in data.stock) {
        msg += `- ${p}: ${data.stock[p]["0.5"]} paq(1/2) | ${data.stock[p]["1"]} paq(1)%0A`;
    }
    
    msg += `---%0A💰 *EFECTIVO A ENTREGAR: $${totalEfectivo.toFixed(2)}*%0A%0A`;
    msg += `_By Antonio Zavala Tolentino_`;

    window.open(`https://wa.me/?text=${msg}`);
}

checkVista();
