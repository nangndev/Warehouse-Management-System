// model.js - ENTITY & DATA LAYER - V17.1

class AuthModel {
    constructor(dbContext) { 
        this.db = dbContext;
        const savedSession = sessionStorage.getItem('nutriUserSession');
        this.currentUser = savedSession ? JSON.parse(savedSession) : null; 
    }
    login(username, password) {
        const user = this.db.dsNhanVien.find(u => u.username === username && u.password === password);
        if (user) { this.currentUser = user; sessionStorage.setItem('nutriUserSession', JSON.stringify(user)); return true; }
        return false;
    }
    logout() { this.currentUser = null; sessionStorage.removeItem('nutriUserSession'); }
    isLoggedIn() { return !!this.currentUser; }
    getRole() { return this.currentUser ? this.currentUser.role : null; }
    getName() { return this.currentUser ? this.currentUser.tenNV : 'Khách'; }
    getUsername() { return this.currentUser ? this.currentUser.username : ''; }
}

class SanPham { constructor(maSP, tenSP, giaBan, danhMucId, min, max, dvNhap, dvXuat, tyLe) { this.maSP = maSP; this.tenSP = tenSP; this.giaBan = parseInt(giaBan); this.danhMucId = danhMucId; this.minStock = parseInt(min); this.maxStock = parseInt(max); this.dvNhap = dvNhap; this.dvXuat = dvXuat; this.tyLe = parseInt(tyLe); } }
class LoHang { constructor(maLo, maSP, ngayHetHan, soLuong, maNCC, giaNhap, trangThai = 'active', giaThanhLy = 0) { this.maLo = maLo; this.maSP = maSP; this.ngayHetHan = ngayHetHan; this.soLuong = soLuong; this.maNCC = maNCC; this.giaNhap = giaNhap; this.trangThai = trangThai; this.giaThanhLy = giaThanhLy; } }
class NhaCungCap { constructor(maNCC, tenNCC, sdt) { this.maNCC = maNCC; this.tenNCC = tenNCC; this.sdt = sdt; } }
class NhanVien { constructor(maNV, tenNV, chucVu, sdt, username, password, role) { this.maNV = maNV; this.tenNV = tenNV; this.chucVu = chucVu; this.sdt = sdt; this.username = username; this.password = password; this.role = role; } }
class PhieuYeuCau { constructor(id, type, requester, details, status = 'pending', date) { this.id = id; this.type = type; this.requester = requester; this.details = details; this.status = status; this.date = date; } }

class DbContext {
    constructor() {
        const saved = JSON.parse(localStorage.getItem('NutriStockDB_V17')) || {}; 
        this.dsSanPham = saved.dsSanPham || this._seedSanPham();
        this.dsLoHang = saved.dsLoHang || this._seedLoHang();
        this.dsNhaCungCap = saved.dsNhaCungCap || this._seedNCC();
        this.dsNhanVien = saved.dsNhanVien || this._seedNV();
        this.lichSuGD = saved.lichSuGD || this._seedHistory();
        this.dsYeuCau = saved.dsYeuCau || []; 
        this.auth = new AuthModel(this);
    }

    saveChanges() {
        localStorage.setItem('NutriStockDB_V17', JSON.stringify({
            dsSanPham: this.dsSanPham, dsLoHang: this.dsLoHang,
            dsNhaCungCap: this.dsNhaCungCap, dsNhanVien: this.dsNhanVien,
            lichSuGD: this.lichSuGD, dsYeuCau: this.dsYeuCau
        }));
    }

    themYeuCau(type, requester, details) { const id = 'REQ' + Date.now(); const date = new Date().toLocaleString('vi-VN'); this.dsYeuCau.push(new PhieuYeuCau(id, type, requester, details, 'pending', date)); this.saveChanges(); }
    capNhatYeuCau(reqId, status) { const req = this.dsYeuCau.find(r => r.id === reqId); if(req) { req.status = status; this.saveChanges(); } }
    themSanPham(ten, gia, danhMucId, min, max, dvNhap, dvXuat, tyLe) { this.dsSanPham.push(new SanPham('sp'+Date.now(), ten, gia, danhMucId, min, max, dvNhap, dvXuat, tyLe)); this.saveChanges(); }
    xoaSanPham(maSP) { this.dsSanPham = this.dsSanPham.filter(s => s.maSP !== maSP); this.saveChanges(); }
    themNhanVien(ten, chucVu, sdt, user, pass, role) { this.dsNhanVien.push(new NhanVien('nv'+Date.now(), ten, chucVu, sdt, user, pass, role)); this.saveChanges(); }
    xoaNhanVien(maNV) { this.dsNhanVien = this.dsNhanVien.filter(n => n.maNV !== maNV); this.saveChanges(); }
    themNhaCungCap(ten, sdt) { this.dsNhaCungCap.push(new NhaCungCap('ncc'+Date.now(), ten, sdt)); this.saveChanges(); }
    xoaNhaCungCap(maNCC) { this.dsNhaCungCap = this.dsNhaCungCap.filter(n => n.maNCC !== maNCC); this.saveChanges(); }
    capNhatKiemKe(maLo, slThucTe) { const lo = this.dsLoHang.find(l => l.maLo === maLo); if (lo) { const chenhLech = slThucTe - lo.soLuong; if (chenhLech !== 0) { lo.soLuong = slThucTe; const todayStr = new Date().toLocaleDateString('en-CA'); this.lichSuGD.push({ date: todayStr, type: 'check', qty: Math.abs(chenhLech), profit: 0, desc: `Kiểm kê lô ${maLo}: ${chenhLech > 0 ? 'Thừa' : 'Thiếu'} ${Math.abs(chenhLech)}` }); } } this.saveChanges(); }
    wipeData() { this.dsSanPham = []; this.dsLoHang = []; this.dsNhaCungCap = []; this.dsNhanVien = []; this.lichSuGD = []; this.dsYeuCau = []; this.saveChanges(); }
    
    _seedSanPham() { return [ new SanPham('sp1', 'Sữa Hạnh Nhân', 25000, 'c1', 20, 100, 'Thùng', 'Hộp', 12), new SanPham('sp2', 'Sữa Đậu Nành', 18000, 'c1', 10, 50, 'Thùng', 'Chai', 24) ]; }
    _seedLoHang() { 
        // Tạo dữ liệu để test: 1 lô cận date (<10 ngày), 1 lô mới (>10 ngày)
        const today = new Date(); 
        const nearExp = new Date(today); nearExp.setDate(today.getDate() + 5); // Còn 5 ngày
        const farFuture = new Date(today); farFuture.setDate(today.getDate() + 100); // Còn 100 ngày
        return [ 
            new LoHang('L_OLD', 'sp1', nearExp.toLocaleDateString('en-CA'), 50, 'ncc1', 18000), 
            new LoHang('L_NEW', 'sp1', farFuture.toLocaleDateString('en-CA'), 100, 'ncc1', 18000),
            new LoHang('L_VIP', 'sp2', farFuture.toLocaleDateString('en-CA'), 200, 'ncc1', 12000) 
        ]; 
    }
    _seedNCC() { return [new NhaCungCap('ncc1', 'Vinamilk Dist', '090123456')]; }
    _seedNV() { return [ new NhanVien('nv1', 'Quản trị viên', 'Chủ cửa hàng', '0909999999', 'admin', '123456', 'admin'), new NhanVien('nv2', 'Nhân viên A', 'Kho vận', '0908888888', 'staff', '123456', 'staff') ]; }
    _seedHistory() { return []; }
}