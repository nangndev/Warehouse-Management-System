// controller.js - CONTROL LAYER - V17.1

class QLNhapKhoControl {
    constructor(db) { this.db = db; }
    executeNhapKho(maSP, maNCC, soLuongNhap, giaNhapDonViNhap, hsd) {
        const sp = this.db.dsSanPham.find(s => s.maSP === maSP); if(!sp) return;
        const soLuongLuuKho = soLuongNhap * sp.tyLe; const giaVonDonVi = giaNhapDonViNhap / sp.tyLe;
        const maLo = 'L' + Date.now().toString().slice(-6); const loMoi = new LoHang(maLo, maSP, hsd, soLuongLuuKho, maNCC, giaVonDonVi); 
        this.db.dsLoHang.push(loMoi); const ncc = this.db.dsNhaCungCap.find(n => n.maNCC === maNCC)?.tenNCC || "Khác";
        const todayStr = new Date().toLocaleDateString('en-CA');
        this.db.lichSuGD.push({ date: todayStr, type: 'import', qty: soLuongLuuKho, profit: 0, desc: `Nhập ${soLuongNhap} ${sp.dvNhap} từ ${ncc}` });
        this.db.saveChanges();
    }
}

class QLXuatKhoControl {
    constructor(db) { this.db = db; }
    
    getDanhSachLoHang(maSP) {
        let cacLo = this.db.dsLoHang.filter(l => l.maSP === maSP && l.soLuong > 0);
        cacLo.sort((a, b) => new Date(a.ngayHetHan) - new Date(b.ngayHetHan)); 
        return cacLo.map(l => {
            const ncc = this.db.dsNhaCungCap.find(n => n.maNCC === l.maNCC)?.tenNCC || "N/A";
            const diffTime = new Date(l.ngayHetHan) - new Date();
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { ...l, tenNCC: ncc, daysLeft: days };
        });
    }

    executeXuatKho(chiTietXuat) {
        let totalQty = 0; let totalProfit = 0;
        chiTietXuat.forEach(item => { let loHang = this.db.dsLoHang.find(l => l.maLo === item.maLo); if (loHang) { loHang.soLuong -= item.soLuongLay; totalQty += item.soLuongLay; const loiNhuanLoto = (item.giaBan - loHang.giaNhap) * item.soLuongLay; totalProfit += loiNhuanLoto; } });
        const todayStr = new Date().toLocaleDateString('en-CA');
        this.db.lichSuGD.push({ date: todayStr, type: 'export', qty: totalQty, profit: totalProfit, desc: `Xuất kho ${totalQty} sản phẩm` });
        this.db.saveChanges();
    }
}

class QLKiemKeControl {
    constructor(db) { this.db = db; }
    layDanhSachKiemKe() { return this.db.dsLoHang.filter(l => l.soLuong > 0).map(l => { const sp = this.db.dsSanPham.find(s => s.maSP === l.maSP); return { maLo: l.maLo, tenSP: sp ? sp.tenSP : l.maSP, hsd: l.ngayHetHan, tonHeThong: l.soLuong }; }); }
    luuKetQuaKiemKe(ketQua) { ketQua.forEach(item => { this.db.capNhatKiemKe(item.maLo, item.slThucTe); }); return true; }
}

class MainController {
    constructor() {
        this.db = new DbContext();
        this.ctrlNhap = new QLNhapKhoControl(this.db);
        this.ctrlXuat = new QLXuatKhoControl(this.db);
        this.ctrlKiemKe = new QLKiemKeControl(this.db);
        this.view = new MainView(this);
        this.init();
    }
    init() { if (this.db.auth.isLoggedIn()) { this.showApp(); } else { this.view.toggleLogin(true); } }
    handleLogin() { const u = document.getElementById('login-user').value; const p = document.getElementById('login-pass').value; if (this.db.auth.login(u, p)) { this.showApp(); } else { alert("Đăng nhập thất bại!"); } }
    handleLogout() { this.db.auth.logout(); this.view.toggleLogin(true); }
    showApp() { this.view.toggleLogin(false); this.view.applyRoleUI(this.db.auth.currentUser); this.updateDataLists(); this.view.switchTab('dashboard'); this.updateDashboard(); this.setupDateDefaults(); }
    setupDateDefaults() { const today = new Date(); const lastWeek = new Date(); lastWeek.setDate(today.getDate() - 7); const startInp = document.getElementById('rpt-start'); const endInp = document.getElementById('rpt-end'); if(startInp) startInp.value = lastWeek.toLocaleDateString('en-CA'); if(endInp) endInp.value = today.toLocaleDateString('en-CA'); }
    chuyenTab(tabId) { this.view.switchTab(tabId); if (tabId === 'warehouse') this.updateWarehouseData(); else this.updateDashboard(); if (tabId === 'reports') this.xuLyLocBaoCao(document.getElementById('rpt-start').value, document.getElementById('rpt-end').value, 'all'); if (tabId === 'check-form') { const data = this.ctrlKiemKe.layDanhSachKiemKe(); this.view.renderCheckTable(data); } if (tabId === 'approvals') { this.view.renderApprovalTable(this.db.dsYeuCau); } }
    updateDataLists() { this.view.renderProductList(this.db.dsSanPham); this.view.renderStaffList(this.db.dsNhanVien); this.view.renderSupplierList(this.db.dsNhaCungCap); this.view.renderProductOptions(this.db.dsSanPham); this.view.renderSupplierOptions(this.db.dsNhaCungCap); }
    getDanhSachLoHang(maSP) { return this.ctrlXuat.getDanhSachLoHang(maSP); }
    xuLyNhapKho(maSP, maNCC, sl, gia, hsd) { const role = this.db.auth.getRole(); if (role === 'staff') { const details = { maSP, maNCC, sl, gia, hsd }; const spName = this.db.dsSanPham.find(s=>s.maSP===maSP)?.tenSP; this.db.themYeuCau('import', this.db.auth.getUsername(), details); alert(`Đã gửi yêu cầu nhập ${sl} ${spName} lên Admin duyệt!`); this.view.renderMyRequests(); } else { this.ctrlNhap.executeNhapKho(maSP, maNCC, sl, gia, hsd); alert('Đã nhập kho thành công!'); this.chuyenTab('warehouse'); } }
    xuLyXuatKho(chiTietXuat) { const role = this.db.auth.getRole(); if (role === 'staff') { const details = { items: chiTietXuat }; this.db.themYeuCau('export', this.db.auth.getUsername(), details); alert(`Đã gửi yêu cầu xuất ${chiTietXuat.length} dòng hàng lên Admin duyệt!`); this.view.renderMyRequests(); } else { this.ctrlXuat.executeXuatKho(chiTietXuat); alert('Xuất kho thành công!'); this.chuyenTab('warehouse'); } }
    xuLyDuyetDon(reqId, isApproved) { const req = this.db.dsYeuCau.find(r => r.id === reqId); if (!req || req.status !== 'pending') return; if (isApproved) { if (req.type === 'import') { const d = req.details; this.ctrlNhap.executeNhapKho(d.maSP, d.maNCC, d.sl, d.gia, d.hsd); } else if (req.type === 'export') { const d = req.details; this.ctrlXuat.executeXuatKho(d.items); } this.db.capNhatYeuCau(reqId, 'approved'); alert("Đã duyệt yêu cầu thành công!"); } else { this.db.capNhatYeuCau(reqId, 'rejected'); alert("Đã từ chối yêu cầu."); } this.view.renderApprovalTable(this.db.dsYeuCau); this.updateDashboard(); }
    xuLyLuuKiemKe(dataInputs) { if(confirm("Xác nhận cập nhật số lượng tồn kho?")) { this.ctrlKiemKe.luuKetQuaKiemKe(dataInputs); alert("Đã cân bằng kho thành công!"); this.chuyenTab('warehouse'); } }
    themNV(ten, chucVu, sdt, user, pass, role) { this.db.themNhanVien(ten, chucVu, sdt, user, pass, role); this.updateDataLists(); }
    themSP(ten, gia, danhMucId, min, max, dvNhap, dvXuat, tyLe) { this.db.themSanPham(ten, gia, danhMucId, min, max, dvNhap, dvXuat, tyLe); this.updateDataLists(); }
    xoaSP(id) { if(confirm('Xóa SP?')) { this.db.xoaSanPham(id); this.updateDataLists(); } }
    xoaNV(id) { if(confirm('Xóa NV?')) { this.db.xoaNhanVien(id); this.updateDataLists(); } }
    themNCC(ten, sdt) { this.db.themNhaCungCap(ten, sdt); this.updateDataLists(); }
    xoaNCC(id) { if(confirm('Xóa NCC?')) { this.db.xoaNhaCungCap(id); this.updateDataLists(); } }
    xuLyLocBaoCao(start, end, type) { let data = this.db.lichSuGD; if(start && end) data = data.filter(item => item.date >= start && item.date <= end); if(type !== 'all') data = data.filter(item => item.type === type); data.sort((a,b) => new Date(b.date) - new Date(a.date)); this.view.renderReportTable(data); }
    
    // [UPDATE] Cập nhật ngưỡng 10 ngày
    hienThiDanhSachCanDate() { 
        const warningDate = new Date(); 
        warningDate.setDate(warningDate.getDate() + 10); // Ngưỡng 10 ngày
        const list = this.db.dsLoHang.filter(l => l.soLuong > 0 && new Date(l.ngayHetHan) < warningDate).map(l => { const sp = this.db.dsSanPham.find(s => s.maSP === l.maSP); const diffTime = new Date(l.ngayHetHan) - new Date(); const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); return { ...l, tenSP: sp.tenSP, daysLeft: days }; }); 
        this.view.showExpiryModal(list); 
    }
    
    xuLyThanhLy(maLo) { const lo = this.db.dsLoHang.find(l => l.maLo === maLo); const sp = this.db.dsSanPham.find(s => s.maSP === lo.maSP); if(lo && sp) { const giaMoi = Math.round(sp.giaBan * 0.7); if(confirm(`Xác nhận thanh lý lô ${maLo}?\nGiá bán sẽ giảm từ ${sp.giaBan} xuống ${giaMoi}`)) { lo.trangThai = 'liquid'; lo.giaThanhLy = giaMoi; this.db.saveChanges(); this.hienThiDanhSachCanDate(); alert("Đã chuyển sang chế độ thanh lý!"); } } }
    xuLyHuyHang(maLo) { if(confirm(`CẢNH BÁO: HỦY lô ${maLo}?\nHành động này sẽ ghi nhận LỖ.`)) { const lo = this.db.dsLoHang.find(l => l.maLo === maLo); if(lo) { const loss = -(lo.giaNhap * lo.soLuong); const todayStr = new Date().toLocaleDateString('en-CA'); this.db.lichSuGD.push({ date: todayStr, type: 'dispose', qty: lo.soLuong, profit: loss, desc: `Hủy lô ${maLo} (Hết hạn)` }); lo.soLuong = 0; lo.trangThai = 'expired'; this.db.saveChanges(); this.hienThiDanhSachCanDate(); this.updateDashboard(); } } }
    getPendingCount() { return this.db.dsYeuCau.filter(r => r.status === 'pending').length; }
    
    // [UPDATE] Cập nhật ngưỡng 10 ngày cho thống kê chung
    calculateSharedStats() { 
        let totalItems = this.db.dsLoHang.reduce((sum, l) => sum + l.soLuong, 0); 
        let totalCost = this.db.dsLoHang.reduce((sum, l) => sum + (l.soLuong * l.giaNhap), 0); 
        const todayStr = new Date().toLocaleDateString('en-CA'); 
        const totalProfit = this.db.lichSuGD.filter(h => h.date === todayStr).reduce((sum, h) => sum + (h.profit || 0), 0); 
        
        const warningDate = new Date(); 
        warningDate.setDate(warningDate.getDate() + 10); // Ngưỡng 10 ngày
        const alertCount = this.db.dsLoHang.filter(l => l.soLuong > 0 && new Date(l.ngayHetHan) < warningDate).length; 
        
        const pendingReq = this.getPendingCount(); 
        return { totalItems, totalCost, totalProfit, alertCount, pendingReq }; 
    }
    
    updateDashboard() { const stats = this.calculateSharedStats(); this.view.renderAllStats(stats); const suggestions = this.getRestockSuggestions(); this.view.renderRestockSuggestions(suggestions); const labels = []; const dataImport = []; const dataExport = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const dStr = d.toLocaleDateString('en-CA'); labels.push(d.getDate() + '/' + (d.getMonth() + 1)); const dayTrans = this.db.lichSuGD.filter(h => h.date === dStr); const imp = dayTrans.filter(h => h.type === 'import').reduce((sum, h) => sum + (h.qty || 0), 0); const exp = dayTrans.filter(h => h.type === 'export').reduce((sum, h) => sum + (h.qty || 0), 0); dataImport.push(imp); dataExport.push(exp); } this.view.renderActivityChart(labels, dataImport, dataExport); this.view.renderMyRequests(); }
    updateWarehouseData() { const stats = this.calculateSharedStats(); this.view.renderAllStats(stats); let report = this.db.dsSanPham.map(sp => { const loHangCuaSP = this.db.dsLoHang.filter(l => l.maSP === sp.maSP); let tongTon = loHangCuaSP.reduce((sum, l) => sum + l.soLuong, 0); let tongGiaTriVon = loHangCuaSP.reduce((sum, l) => sum + (l.soLuong * l.giaNhap), 0); let giaVonTB = tongTon > 0 ? Math.round(tongGiaTriVon / tongTon) : 0; return { ...sp, tongTon, tongGiaTriVon, giaVonTB }; }); this.view.renderWarehouseTable(report); }
    getRestockSuggestions() { return this.db.dsSanPham.map(sp => { const tongTon = this.db.dsLoHang.filter(l => l.maSP === sp.maSP).reduce((sum, l) => sum + l.soLuong, 0); if (tongTon < sp.minStock) return { maSP: sp.maSP, tenSP: sp.tenSP, tongTon: tongTon, minStock: sp.minStock, canNhap: sp.minStock - tongTon }; return null; }).filter(item => item !== null).sort((a,b) => b.canNhap - a.canNhap); }
    xuLyNapMau() { if(confirm("Nạp lại dữ liệu mẫu (Sẽ xóa hết dữ liệu cũ)?")) { const keys = ['NutriStockDB_V10', 'NutriStockDB_V11', 'NutriStockDB_V12', 'NutriStockDB_V13', 'NutriStockDB_V14', 'NutriStockDB_V15', 'NutriStockDB_V16', 'NutriStockDB_V17']; keys.forEach(k => localStorage.removeItem(k)); location.reload(); } }
    xuLyXoaTrang() { if(confirm("XÓA SẠCH DỮ LIỆU?")) { this.db.wipeData(); location.reload(); } }
}