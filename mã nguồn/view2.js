// view.js - BOUNDARY / VIEW LAYER - V17.1

class MainView {
    constructor(controller) {
        this.controller = controller;
        this.chartInstance = null;
        window.app = {
            nav: (id) => this.controller.chuyenTab(id),
            processImport: () => this.onBtnNhapKhoClick(),
            confirmExport: () => this.onBtnXuatKhoClick(),
            addProduct: () => this.onBtnThemSP(),
            delProd: (id) => this.controller.xoaSP(id),
            addStaff: () => this.onBtnThemNV(),
            delStaff: (id) => this.controller.xoaNV(id),
            addSupplier: () => this.onBtnThemNCC(),
            delSup: (id) => this.controller.xoaNCC(id),
            filterReport: () => this.onBtnLocBaoCao(),
            resetSample: () => this.controller.xuLyNapMau(),
            clearAll: () => this.controller.xuLyXoaTrang(),
            login: () => this.controller.handleLogin(),
            logout: () => this.controller.handleLogout(),
            calcDiff: (input, sysQty, idDiff) => this.calcDiffLogic(input, sysQty, idDiff),
            saveCheck: () => this.onBtnLuuKiemKe(),
            updateImportUnit: () => this.updateImportUnitLabel(),
            closeModal: () => document.getElementById('expiry-modal').classList.add('hidden'),
            openExpiry: () => this.controller.hienThiDanhSachCanDate(),
            setLiquidation: (maLo) => this.controller.xuLyThanhLy(maLo),
            disposeBatch: (maLo) => this.controller.xuLyHuyHang(maLo),
            loadBatchesForExport: () => this.loadBatchesForExport(),
            applyStrategy: () => this.applyStrategy(),
            addToExportList: () => this.addToExportList(),
            updateTotalExport: () => this.updateTotalExport(),
            approveReq: (id) => this.controller.xuLyDuyetDon(id, true),
            rejectReq: (id) => this.controller.xuLyDuyetDon(id, false)
        };
        this.exportCart = [];
    }

    // [NEW LOGIC] Tải danh sách lô hàng có LỌC theo loại khách
    loadBatchesForExport() {
        const maSP = document.getElementById('exp-product').value;
        const tbody = document.getElementById('batch-selection-body');
        
        // Lấy loại khách hàng từ radio button
        const strategy = document.querySelector('input[name="export-strategy"]:checked').value;
        const EXPIRY_THRESHOLD = 10; // Quy định mới: 10 ngày

        if(!maSP) { tbody.innerHTML = ''; return; }
        
        // Lấy toàn bộ danh sách lô của sản phẩm này
        let batches = this.controller.getDanhSachLoHang(maSP);
        
        // [FILTER LOGIC]
        if (strategy === 'vip') {
            // Khách VIP: Chỉ hiện hàng DATE MỚI (> 10 ngày)
            batches = batches.filter(b => b.daysLeft > EXPIRY_THRESHOLD);
            // Sắp xếp: Mới nhất lên đầu (LIFO) để khách VIP thấy hàng ngon nhất
            batches.sort((a, b) => b.daysLeft - a.daysLeft);
        } else {
            // Khách thường: Chỉ hiện hàng SẮP HẾT HẠN (<= 10 ngày)
            batches = batches.filter(b => b.daysLeft <= EXPIRY_THRESHOLD);
            // Sắp xếp: Cũ nhất lên đầu (FEFO) để đẩy hàng đi nhanh
            batches.sort((a, b) => a.daysLeft - b.daysLeft);
        }

        if (batches.length === 0) {
            const msg = strategy === 'vip' 
                ? "Không có lô hàng Date mới (>10 ngày) nào." 
                : "Không có lô hàng sắp hết hạn (<=10 ngày) nào.";
            tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-400 italic font-bold">${msg}</td></tr>`;
            return;
        }

        tbody.innerHTML = batches.map(b => {
            const isNearExp = b.daysLeft <= EXPIRY_THRESHOLD;
            const rowClass = isNearExp ? 'bg-red-50' : 'bg-green-50';
            const statusText = b.trangThai === 'liquid' ? '<span class="text-orange-600 font-bold">(Thanh lý)</span>' : '';
            return `
            <tr class="border-b ${rowClass}">
                <td class="p-3">
                    <div class="font-bold text-gray-800">${b.maLo} ${statusText}</div>
                    <div class="text-xs ${isNearExp ? 'text-red-600 font-bold' : 'text-green-700 font-bold'}">
                        HSD: ${b.hsd} (Còn ${b.daysLeft} ngày)
                    </div>
                </td>
                <td class="p-3 text-center font-bold">${b.soLuong}</td>
                <td class="p-3 text-xs text-gray-500">${b.tenNCC}</td>
                <td class="p-3 bg-white border-l">
                    <input type="number" data-malo="${b.maLo}" data-max="${b.soLuong}" 
                           class="w-full p-2 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-blue-500 export-batch-input" 
                           placeholder="0" min="0" max="${b.soLuong}" oninput="app.updateTotalExport()">
                </td>
            </tr>`;
        }).join('');
        this.updateTotalExport();
    }

    // [NEW LOGIC] Điền tự động
    applyStrategy() {
        const totalNeeded = parseInt(document.getElementById('exp-auto-qty').value);
        if (!totalNeeded || totalNeeded <= 0) return alert("Vui lòng nhập số lượng cần xuất!");
        
        const inputs = document.querySelectorAll('.export-batch-input');
        if (inputs.length === 0) return alert("Không có lô hàng nào phù hợp với tiêu chí đã chọn!");

        // Reset về 0
        inputs.forEach(inp => inp.value = '');

        let conLai = totalNeeded;
        // Vì danh sách đã được LỌC và SẮP XẾP chuẩn ở hàm loadBatchesForExport
        // Nên ta chỉ cần điền từ trên xuống dưới là đúng ý đồ
        inputs.forEach(inp => {
            if (conLai <= 0) return;
            const max = parseInt(inp.dataset.max);
            const lay = Math.min(conLai, max);
            inp.value = lay;
            conLai -= lay;
        });

        this.updateTotalExport();
        if (conLai > 0) alert(`Lưu ý: Không đủ hàng theo tiêu chí này! Thiếu ${conLai} đv.`);
    }

    // Cập nhật hàm hiển thị cảnh báo date chung cho toàn hệ thống (dùng ngưỡng 10 ngày)
    showExpiryModal(list) {
        const tbody = document.getElementById('expiry-list-body');
        const modal = document.getElementById('expiry-modal');
        modal.classList.remove('hidden');
        if(list.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">Không có lô hàng nào sắp hết hạn (< 10 ngày).</td></tr>`; return; }
        
        tbody.innerHTML = list.map(item => `
            <tr class="border-b hover:bg-red-50">
                <td class="p-3 font-bold">${item.tenSP}</td>
                <td class="p-3 text-red-600 font-mono font-bold">${item.hsd} <br><span class="text-xs">(${item.daysLeft} ngày)</span></td>
                <td class="p-3 text-center font-bold">${item.soLuong}</td>
                <td class="p-3 text-sm">Vốn: ${item.giaNhap.toLocaleString()}</td>
                <td class="p-3 text-right">
                    ${item.trangThai === 'liquid' ? `<span class="text-orange-600 font-bold text-xs">Đang thanh lý</span>` : `<button onclick="app.setLiquidation('${item.maLo}')" class="bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs font-bold hover:bg-orange-200 mr-2">Thanh lý</button>`}
                    <button onclick="app.disposeBatch('${item.maLo}')" class="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold hover:bg-red-200">Hủy</button>
                </td>
            </tr>`).join('');
    }

    // --- Các hàm cũ giữ nguyên ---
    updateTotalExport() { let sum = 0; document.querySelectorAll('.export-batch-input').forEach(inp => { let val = parseInt(inp.value) || 0; const max = parseInt(inp.dataset.max); if (val > max) { val = max; inp.value = max; } if (val < 0) { val = 0; inp.value = 0; } sum += val; }); document.getElementById('total-export-qty').innerText = sum; }
    addToExportList() { const maSP = document.getElementById('exp-product').value; const tenSP = document.getElementById('exp-product').options[document.getElementById('exp-product').selectedIndex].text; const inputs = document.querySelectorAll('.export-batch-input'); let addedCount = 0; inputs.forEach(inp => { const val = parseInt(inp.value) || 0; const maLo = inp.dataset.malo; if (val > 0) { const batchInfo = this.controller.db.dsLoHang.find(l => l.maLo === maLo); const nccInfo = this.controller.db.dsNhaCungCap.find(n => n.maNCC === batchInfo.maNCC); let giaBan = this.controller.db.dsSanPham.find(s=>s.maSP===maSP).giaBan; if(batchInfo.trangThai === 'liquid') giaBan = batchInfo.giaThanhLy; this.exportCart.push({ maLo: maLo, maSP: maSP, tenSP: tenSP, tenNCC: nccInfo ? nccInfo.tenNCC : 'N/A', soLuongLay: val, hsd: batchInfo.ngayHetHan, giaVon: batchInfo.giaNhap, giaBan: giaBan }); addedCount += val; inp.value = ''; } }); if (addedCount > 0) { this.renderExportCart(); this.updateTotalExport(); document.getElementById('exp-auto-qty').value = ''; } else { alert("Vui lòng nhập số lượng!"); } }
    renderReportTable(data) { const role = this.controller.db.auth.getRole(); const tbody = document.getElementById('rpt-body'); if(!tbody) return; if(data.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">Không có dữ liệu</td></tr>`; return; } const html = data.map(item => `<tr class="border-b border-gray-50 hover:bg-gray-50"><td class="p-3 font-mono text-gray-600">${item.date}</td><td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold ${item.type==='import'?'bg-green-100 text-green-700':item.type==='export'?'bg-yellow-100 text-yellow-700':item.type==='dispose'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}">${item.type==='import'?'Nhập kho':item.type==='export'?'Xuất kho':item.type==='dispose'?'Hủy hàng':'Kiểm kê'}</span></td><td class="p-3 font-semibold text-gray-700">${item.desc}</td><td class="p-3 text-right font-bold">${item.qty}</td><td class="p-3 text-right font-bold ${item.profit>0?'text-green-600':item.profit<0?'text-red-500':'text-gray-400'}">${role === 'admin' ? (item.profit ? item.profit.toLocaleString() : '-') : '***'}</td></tr>`).join(''); tbody.innerHTML = html; }
    renderApprovalTable(list) { const tbody = document.getElementById('approval-list-body'); if(!tbody) return; const pendings = list.filter(r => r.status === 'pending'); if (pendings.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-400 italic">Không có yêu cầu nào chờ duyệt.</td></tr>`; return; } tbody.innerHTML = pendings.map(req => { let detailText = req.type === 'import' ? `Nhập <b>${req.details.sl}</b> ${this.controller.db.dsSanPham.find(s=>s.maSP===req.details.maSP)?.tenSP || req.details.maSP}` : `Xuất <b>${req.details.items.length}</b> dòng hàng`; return `<tr class="border-b hover:bg-gray-50"><td class="p-3 font-mono text-xs text-gray-500">${req.id}<br>${req.date}</td><td class="p-3 font-bold text-blue-600">${req.requester}</td><td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold ${req.type === 'import' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${req.type === 'import' ? 'Nhập kho' : 'Xuất kho'}</span></td><td class="p-3 text-sm">${detailText}</td><td class="p-3 text-right"><button onclick="app.approveReq('${req.id}')" class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm mr-2"><i class="fas fa-check"></i> Duyệt</button><button onclick="app.rejectReq('${req.id}')" class="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 text-sm"><i class="fas fa-times"></i></button></td></tr>`; }).join(''); }
    renderMyRequests() { const container = document.getElementById('my-requests-body'); if(!container) return; const username = this.controller.db.auth.getUsername(); const myReqs = this.controller.db.dsYeuCau.filter(r => r.requester === username).reverse().slice(0, 5); if (myReqs.length === 0) { container.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-400 text-xs">Bạn chưa gửi yêu cầu nào.</td></tr>`; return; } container.innerHTML = myReqs.map(req => { let statusColor = req.status === 'approved' ? 'bg-green-100 text-green-700' : (req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'); let statusText = req.status === 'approved' ? 'Đã duyệt' : (req.status === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt'); return `<tr class="border-b text-xs"><td class="p-2 text-gray-500">${req.date}</td><td class="p-2 font-bold">${req.type==='import' ? 'Nhập' : 'Xuất'}</td><td class="p-2"><span class="px-2 py-0.5 rounded ${statusColor}">${statusText}</span></td></tr>`; }).join(''); }
    renderAllStats(stats) { const role = this.controller.db.auth.getRole(); const alertText = stats.alertCount + ' lô'; const itemText = stats.totalItems; const valueText = stats.totalCost.toLocaleString() + ' đ'; const profitText = stats.totalProfit.toLocaleString() + ' đ'; if(document.getElementById('dash-stat-items')) document.getElementById('dash-stat-items').innerText = itemText; if(document.getElementById('dash-stat-alert')) document.getElementById('dash-stat-alert').innerText = alertText; if(document.getElementById('wh-stat-items')) document.getElementById('wh-stat-items').innerText = itemText; if(document.getElementById('wh-stat-alert')) document.getElementById('wh-stat-alert').innerText = alertText; const badge = document.getElementById('approval-badge'); if(badge) { if(role === 'admin' && stats.pendingReq > 0) { badge.innerText = stats.pendingReq; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); } } if (role === 'admin') { if(document.getElementById('dash-stat-value')) document.getElementById('dash-stat-value').innerText = valueText; if(document.getElementById('dash-stat-today')) document.getElementById('dash-stat-today').innerText = profitText; if(document.getElementById('wh-stat-value')) document.getElementById('wh-stat-value').innerText = valueText; if(document.getElementById('wh-stat-today')) document.getElementById('wh-stat-today').innerText = profitText; if(document.getElementById('wh-stat-value-box')) document.getElementById('wh-stat-value-box').classList.remove('hidden'); if(document.getElementById('wh-stat-profit-box')) document.getElementById('wh-stat-profit-box').classList.remove('hidden'); } else { if(document.getElementById('wh-stat-value-box')) document.getElementById('wh-stat-value-box').classList.add('hidden'); if(document.getElementById('wh-stat-profit-box')) document.getElementById('wh-stat-profit-box').classList.add('hidden'); } ['dash-stat-alert', 'wh-stat-alert'].forEach(id => { const el = document.getElementById(id); if(el && stats.alertCount > 0) { el.parentElement.classList.add('cursor-pointer', 'animate-pulse'); el.parentElement.onclick = () => app.openExpiry(); } else if(el) { el.parentElement.classList.remove('cursor-pointer', 'animate-pulse'); el.parentElement.onclick = null; } }); }
    renderWarehouseTable(reportData) { const role = this.controller.db.auth.getRole(); const html = reportData.map(r => { let statusBadge = r.tongTon <= r.minStock ? `<span class="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold animate-pulse">Sắp hết</span>` : `<span class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">Ổn định</span>`; const thung = Math.floor(r.tongTon / r.tyLe); const le = r.tongTon % r.tyLe; const tonKhoStr = thung > 0 ? `<b>${thung}</b> ${r.dvNhap}, ${le} ${r.dvXuat}` : `<b>${le}</b> ${r.dvXuat}`; let moneyCols = role === 'admin' ? `<td class="p-3 text-right text-sm"><div>Vốn: ${r.giaVonTB.toLocaleString()}đ</div><div class="font-bold text-green-600">Bán: ${r.giaBan.toLocaleString()}đ</div></td><td class="p-3 text-right font-bold text-gray-700">${(r.tongGiaTriVon).toLocaleString()}đ</td>` : `<td class="p-3 text-right text-sm text-gray-400">---</td><td class="p-3 text-right font-bold text-gray-400">---</td>`; return `<tr class="border-b hover:bg-white ${r.tongTon <= r.minStock ? 'bg-red-50' : ''}"><td class="p-3"><div class="font-bold text-gray-800">${r.tenSP}</div><div class="text-xs text-gray-500">1 ${r.dvNhap} = ${r.tyLe} ${r.dvXuat}</div></td><td class="p-3 text-center text-gray-700">${tonKhoStr}</td><td class="p-3 text-center">${statusBadge}</td>${moneyCols}</tr>`; }).join(''); document.getElementById('wh-inventory-body').innerHTML = html; }
    applyRoleUI(user) { const role = user.role; const name = user.tenNV; document.getElementById('user-name-display').innerText = name; document.getElementById('user-role-display').innerText = role === 'admin' ? 'Quản trị viên' : 'Nhân viên'; document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden')); const navApproval = document.getElementById('nav-approvals'); if (role === 'staff') { document.getElementById('nav-employees').classList.add('hidden'); document.getElementById('nav-suppliers').classList.add('hidden'); document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden')); document.getElementById('card-money-value').classList.add('hidden'); document.getElementById('card-money-profit').classList.add('hidden'); if(navApproval) navApproval.classList.add('hidden'); document.getElementById('staff-requests-card').classList.remove('hidden'); } else { document.getElementById('nav-employees').classList.remove('hidden'); document.getElementById('nav-suppliers').classList.remove('hidden'); document.getElementById('card-money-value').classList.remove('hidden'); document.getElementById('card-money-profit').classList.remove('hidden'); if(navApproval) navApproval.classList.remove('hidden'); document.getElementById('staff-requests-card').classList.add('hidden'); } }
    toggleLogin(show) { const loginScreen = document.getElementById('login-screen'); const mainLayout = document.getElementById('main-layout'); if (show) { loginScreen.classList.remove('hidden'); mainLayout.classList.add('hidden'); document.getElementById('login-user').value = ''; document.getElementById('login-pass').value = ''; } else { loginScreen.classList.add('hidden'); mainLayout.classList.remove('hidden'); mainLayout.classList.add('flex'); } }
    switchTab(tabId) { document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active')); document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active')); const target = document.getElementById(tabId); if (target) target.classList.add('active'); const map = {'dashboard':'nav-dashboard', 'warehouse':'nav-warehouse', 'products':'nav-products', 'employees':'nav-employees', 'suppliers':'nav-suppliers', 'reports':'nav-reports', 'approvals':'nav-approvals'}; const navId = map[tabId] || 'nav-warehouse'; if(document.getElementById(navId)) document.getElementById(navId).classList.add('active'); }
    calcDiffLogic(input, sysQty, idDiff) {const actual = parseInt(input.value) || 0;const diff = actual - sysQty;const el = document.getElementById(idDiff);if(diff > 0) { el.innerText = `+${diff}`; el.className = "text-center font-bold text-green-600"; }else if(diff < 0) { el.innerText = `${diff}`; el.className = "text-center font-bold text-red-600"; }else { el.innerText = "0"; el.className = "text-center font-bold text-gray-400"; }}
    renderRestockSuggestions(suggestions) {const container = document.getElementById('restock-suggestions');if(!container) return;if(suggestions.length === 0) {container.innerHTML = `<div class="text-center text-gray-400 py-4 italic">Kho hàng đang ổn định, chưa cần nhập thêm.</div>`;return;}const html = `<table class="w-full text-left text-sm"><thead class="bg-green-50 text-green-800 font-bold"><tr><th class=\"p-3\">Sản phẩm</th><th class=\"p-3 text-center\">Tồn / Min</th><th class=\"p-3 text-center\">Cần nhập</th><th class=\"p-3\"></th></tr></thead><tbody>${suggestions.map(s => `<tr class="border-b border-dashed hover:bg-gray-50"><td class="p-3 font-semibold">${s.tenSP}</td><td class="p-3 text-center"><span class="text-red-600 font-bold">${s.tongTon}</span> / ${s.minStock}</td><td class="p-3 text-center font-bold text-green-700">+${s.canNhap}</td><td class="p-3 text-right"><button onclick="app.nav('import-form'); document.getElementById('imp-product').value='${s.maSP}'; app.updateImportUnit()" class="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Nhập ngay</button></td></tr>`).join('')}</tbody></table>`;container.innerHTML = html;}
    renderProductOptions(dsSanPham){const html=dsSanPham.map(s=>`<option value="${s.maSP}" data-dvnhap="${s.dvNhap}" data-dvxuat="${s.dvXuat}" data-tyle="${s.tyLe}">${s.tenSP}</option>`).join('');const imp=document.getElementById('imp-product');const exp=document.getElementById('exp-product');if(imp){imp.innerHTML=html;this.updateImportUnitLabel();}if(exp){exp.innerHTML='<option value="">-- Chọn sản phẩm --</option>' + html;}}
    updateImportUnitLabel(){const sel=document.getElementById('imp-product');const opt=sel.options[sel.selectedIndex];if(opt){document.getElementById('lbl-imp-unit').innerText=`Số lượng (${opt.dataset.dvnhap})`;document.getElementById('lbl-imp-price').innerText=`Giá nhập/${opt.dataset.dvnhap}`;}}
    renderSupplierOptions(dsNCC){const html=dsNCC.map(n=>`<option value="${n.maNCC}">${n.tenNCC}</option>`).join('');const impSup=document.getElementById('imp-supplier');if(impSup)impSup.innerHTML=html;}
    renderProductList(list){const cats=[{id:'c1',name:'Sữa Hạt'},{id:'c2',name:'Sữa Tươi'},{id:'c3',name:'Ngũ Cốc'}];document.getElementById('cat-list').innerHTML=cats.map(c=>`<li class="flex justify-between p-2 bg-gray-50 mb-1 rounded"><span>${c.name}</span></li>`).join('');document.getElementById('new-prod-cat').innerHTML=cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');const html=list.map(p=>`<tr class="border-b"><td class="p-2"><div class="font-bold text-green-700">${p.tenSP}</div><div class="text-xs text-gray-400">Quy đổi: 1 ${p.dvNhap} = ${p.tyLe} ${p.dvXuat}</div></td><td class="p-2 text-center text-xs">Min: <b>${p.minStock}</b><br>Max: <b>${p.maxStock}</b></td><td class="p-2 text-right">${p.giaBan.toLocaleString()} / ${p.dvXuat}</td><td class="p-2 text-right"><i onclick="app.delProd('${p.maSP}')" class="fas fa-trash text-red-400 cursor-pointer hover:text-red-600"></i></td></tr>`).join('');document.getElementById('prod-list').innerHTML=html;}
    renderStaffList(list){const html=list.map(e=>`<div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative group"><img src="https://ui-avatars.com/api/?name=${e.tenNV}&background=random" class="w-12 h-12 rounded-full"><div><h4 class="font-bold text-gray-800">${e.tenNV}</h4><p class="text-xs text-green-600 font-bold uppercase">${e.chucVu}</p><p class="text-xs text-gray-400"><i class="fas fa-phone mr-1"></i>${e.sdt}</p><p class="text-xs text-gray-500 mt-1 bg-gray-100 p-1 rounded inline-block">User: ${e.username} (${e.role})</p></div><button onclick="app.delStaff('${e.maNV}')" class="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><i class="fas fa-trash"></i></button></div>`).join('');document.getElementById('staff-list').innerHTML=html;}
    renderSupplierList(list){const html=list.map(s=>`<tr class="border-b hover:bg-white"><td class="p-4 font-bold text-gray-800">${s.tenNCC}</td><td class="p-4 text-gray-600"><i class="fas fa-phone-alt mr-2 text-green-500"></i>${s.sdt}</td><td class="p-4 text-right"><button onclick="app.delSup('${s.maNCC}')" class="btn-danger"><i class="fas fa-trash"></i></button></td></tr>`).join('');document.getElementById('sup-list').innerHTML=html;}
    renderExportCart(){const html=this.exportCart.map(item=>`<tr class="border-b border-dashed"><td class="py-2"><div class="font-bold">${item.tenSP}</div><div class="text-xs text-gray-400">Từ: ${item.tenNCC}</div></td><td class="py-2"><span class="bg-red-100 text-red-600 text-xs font-bold px-1 rounded">Lô ${item.maLo}</span></td><td class="py-2 font-bold">${item.soLuongLay}</td><td class="py-2 text-right text-xs text-gray-400">${item.hsd}</td></tr>`).join('');document.getElementById('exp-list-body').innerHTML=html;}
    onBtnNhapKhoClick(){const maSP=document.getElementById('imp-product').value;const maNCC=document.getElementById('imp-supplier').value;const slNhap=parseInt(document.getElementById('imp-qty').value);const giaNhapTong=parseInt(document.getElementById('imp-price').value);const hsd=document.getElementById('imp-exp').value;if(!slNhap||!hsd||!giaNhapTong)return alert('Vui lòng nhập đủ thông tin (Số lượng, Giá nhập, HSD)');this.controller.xuLyNhapKho(maSP,maNCC,slNhap,giaNhapTong,hsd);}
    onBtnXuatKhoClick(){if(this.exportCart.length===0)return alert('Giỏ hàng trống');this.controller.xuLyXuatKho(this.exportCart);this.exportCart=[];this.renderExportCart();}
    onBtnThemSP(){const ten=document.getElementById('new-prod-name').value;const cat=document.getElementById('new-prod-cat').value;const dvNhap=document.getElementById('new-prod-dvnhap').value;const dvXuat=document.getElementById('new-prod-dvxuat').value;const tyLe=parseInt(document.getElementById('new-prod-tyle').value)||1;const gia=parseInt(document.getElementById('new-prod-price').value);const min=parseInt(document.getElementById('new-prod-min').value)||0;const max=parseInt(document.getElementById('new-prod-max').value)||1000;if(ten&&gia&&dvNhap&&dvXuat){this.controller.themSP(ten,gia,cat,min,max,dvNhap,dvXuat,tyLe);document.getElementById('new-prod-name').value='';}else{alert("Vui lòng nhập đủ Tên, Các loại đơn vị và Giá bán!");}}
    onBtnThemNV(){const ten=document.getElementById('st-name').value;const cv=document.getElementById('st-role').value;const sdt=document.getElementById('st-phone').value;const user=document.getElementById('st-user').value;const pass=document.getElementById('st-pass').value;const role=document.getElementById('st-role-opt').value;if(ten&&user&&pass){this.controller.themNV(ten,cv,sdt,user,pass,role);document.getElementById('add-staff-form').classList.add('hidden');}else{alert("Vui lòng nhập đủ thông tin đăng nhập!");}}
    onBtnThemNCC(){const ten=document.getElementById('sup-name').value;const sdt=document.getElementById('sup-contact').value;if(ten){this.controller.themNCC(ten,sdt);document.getElementById('sup-name').value='';}}
    onBtnLocBaoCao(){const start=document.getElementById('rpt-start').value;const end=document.getElementById('rpt-end').value;const type=document.getElementById('rpt-type').value;this.controller.xuLyLocBaoCao(start,end,type);}
    renderCheckTable(data){const tbody=document.getElementById('check-list-body');if(!tbody)return;if(data.length===0){tbody.innerHTML=`<tr><td colspan="6" class="p-6 text-center text-gray-400 italic">Kho đang trống, không có gì để kiểm kê!</td></tr>`;return;}const html=data.map((item,index)=>`<tr class="border-b hover:bg-blue-50 transition-colors"><td class="p-3 font-mono text-xs text-gray-500">${item.maLo}</td><td class="p-3 font-semibold text-gray-700">${item.tenSP}</td><td class="p-3 text-sm text-gray-500">${item.hsd}</td><td class="p-3 text-center font-bold text-blue-600">${item.tonHeThong}</td><td class="p-3"><input type="number" data-malo="${item.maLo}" value="${item.tonHeThong}" class="w-full border border-gray-300 rounded p-1 text-center focus:ring-2 focus:ring-blue-500 outline-none check-input" oninput="app.calcDiff(this, ${item.tonHeThong}, 'diff-${index}')"></td><td class="p-3 text-center font-bold text-gray-400" id="diff-${index}">0</td></tr>`).join('');tbody.innerHTML=html;}
    onBtnLuuKiemKe(){const inputs=document.querySelectorAll('.check-input');const data=[];inputs.forEach(inp=>{data.push({maLo:inp.dataset.malo,slThucTe:parseInt(inp.value)||0});});this.controller.xuLyLuuKiemKe(data);}
    renderActivityChart(labels, dataImport, dataExport) { const ctx = document.getElementById('activityChart'); if (!ctx) return; if (this.chartInstance) this.chartInstance.destroy(); this.chartInstance = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [ { label: 'Nhập (SL)', data: dataImport, backgroundColor: '#4CAF50', borderRadius: 4 }, { label: 'Xuất (SL)', data: dataExport, backgroundColor: '#FFCA28', borderRadius: 4 } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } } }); }
}