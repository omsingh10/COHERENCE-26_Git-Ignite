import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fl_chart/fl_chart.dart';

const String kBaseUrl = 'http://192.168.22.222:8000';

// ============ COLOR PALETTE ============
class AppColors {
  static const bg = Color(0xFF0A0E21);
  static const card = Color(0xFF1D1F33);
  static const cardLight = Color(0xFF252840);
  static const accent = Color(0xFF6C63FF);
  static const saffron = Color(0xFFFF9933);
  static const green = Color(0xFF138808);
  static const white = Color(0xFFF1F5F9);
  static const muted = Color(0xFF8D8E98);
  static const danger = Color(0xFFEB5757);
  static const success = Color(0xFF27AE60);
  static const blue = Color(0xFF2F80ED);
}

void main() => runApp(IndiaBudgetApp());

class IndiaBudgetApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hisab Kitab',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.bg,
        primaryColor: AppColors.accent,
        colorScheme: ColorScheme.dark(
          primary: AppColors.accent,
          secondary: AppColors.saffron,
          surface: AppColors.card,
        ),
        cardTheme: CardThemeData(
          color: AppColors.card,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.bg,
          elevation: 0,
          centerTitle: false,
        ),
        fontFamily: 'Roboto',
      ),
      home: AuthGate(),
    );
  }
}

// ============ AUTH GATE ============
class AuthGate extends StatefulWidget {
  @override
  _AuthGateState createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _checking = true;
  String? _token;

  @override
  void initState() {
    super.initState();
    _checkToken();
  }

  Future<void> _checkToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    setState(() {
      _token = token;
      _checking = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_checking)
      return Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.accent)),
      );
    return (_token != null && _token!.isNotEmpty) ? MainShell() : LoginScreen();
  }
}

// ============ LOGIN SCREEN ============
class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _userC = TextEditingController();
  final _passC = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _obscure = true;
  late AnimationController _animC;
  late Animation<double> _fadeIn;

  @override
  void initState() {
    super.initState();
    _animC = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 800),
    );
    _fadeIn = CurvedAnimation(parent: _animC, curve: Curves.easeOut);
    _animC.forward();
  }

  @override
  void dispose() {
    _animC.dispose();
    _userC.dispose();
    _passC.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final u = _userC.text.trim(), p = _passC.text.trim();
    if (u.isEmpty || p.isEmpty) {
      setState(() => _error = 'Enter username & password');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await http
          .post(
            Uri.parse('$kBaseUrl/token'),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body:
                'username=${Uri.encodeComponent(u)}&password=${Uri.encodeComponent(p)}',
          )
          .timeout(Duration(seconds: 10));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final token = data['access_token'] as String;
        final userRes = await http.get(
          Uri.parse('$kBaseUrl/users/me'),
          headers: {'Authorization': 'Bearer $token'},
        );
        String role = 'public', fullName = u;
        String? dept;
        if (userRes.statusCode == 200) {
          final ud = json.decode(userRes.body);
          role = ud['role'] ?? 'public';
          fullName = ud['full_name'] ?? u;
          dept = ud['department'];
        }
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
        await prefs.setString('username', u);
        await prefs.setString('role', role);
        await prefs.setString('full_name', fullName);
        if (dept != null) await prefs.setString('department', dept);
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => MainShell()),
        );
      } else if (res.statusCode == 401) {
        setState(() => _error = 'Invalid username or password');
      } else {
        setState(() => _error = 'Server error (${res.statusCode})');
      }
    } catch (e) {
      setState(() => _error = 'Cannot connect to server');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FadeTransition(
        opacity: _fadeIn,
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(32),
            child: Column(
              children: [
                // Indian flag stripe
                Container(
                  height: 6,
                  width: 80,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(3),
                    gradient: LinearGradient(
                      colors: [
                        AppColors.saffron,
                        Colors.white,
                        AppColors.green,
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 24),
                Container(
                  padding: EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [AppColors.accent, Color(0xFF8B5CF6)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: Icon(
                    Icons.account_balance,
                    size: 44,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: 20),
                Text(
                  'Hisab Kitab',
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Your window into India\'s budget',
                  style: TextStyle(color: AppColors.muted, fontSize: 14),
                ),
                SizedBox(height: 40),
                _inputField(_userC, 'Username', Icons.person_outline, false),
                SizedBox(height: 14),
                _inputField(_passC, 'Password', Icons.lock_outline, true),
                SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _login,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    child: _loading
                        ? SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            'Sign In',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
                if (_error != null) ...[
                  SizedBox(height: 16),
                  Container(
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.error_outline,
                          color: AppColors.danger,
                          size: 18,
                        ),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _error!,
                            style: TextStyle(
                              color: AppColors.danger,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                SizedBox(height: 28),
                Container(
                  padding: EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Quick Login',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppColors.accent,
                          fontSize: 13,
                        ),
                      ),
                      SizedBox(height: 10),
                      _demoChip('public_user', 'Citizen', Icons.people),
                      _demoChip('admin', 'Admin', Icons.admin_panel_settings),
                      _demoChip(
                        'health_dept',
                        'Health Dept',
                        Icons.local_hospital,
                      ),
                      SizedBox(height: 6),
                      Text(
                        'Password: admin123',
                        style: TextStyle(fontSize: 10, color: AppColors.muted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _inputField(
    TextEditingController c,
    String label,
    IconData icon,
    bool isPass,
  ) {
    return TextField(
      controller: c,
      obscureText: isPass && _obscure,
      style: TextStyle(fontSize: 15),
      decoration: InputDecoration(
        hintText: label,
        hintStyle: TextStyle(color: AppColors.muted),
        prefixIcon: Icon(icon, color: AppColors.muted, size: 20),
        suffixIcon: isPass
            ? IconButton(
                icon: Icon(
                  _obscure ? Icons.visibility_off : Icons.visibility,
                  color: AppColors.muted,
                  size: 20,
                ),
                onPressed: () => setState(() => _obscure = !_obscure),
              )
            : null,
        filled: true,
        fillColor: AppColors.card,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      onSubmitted: isPass ? (_) => _login() : null,
      textInputAction: isPass ? TextInputAction.done : TextInputAction.next,
    );
  }

  Widget _demoChip(String user, String label, IconData icon) {
    return Padding(
      padding: EdgeInsets.only(bottom: 6),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () {
          _userC.text = user;
          _passC.text = 'admin123';
        },
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 4, horizontal: 4),
          child: Row(
            children: [
              Icon(icon, size: 16, color: AppColors.accent),
              SizedBox(width: 8),
              Text(
                user,
                style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
              ),
              SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(fontSize: 11, color: AppColors.muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============ MAIN SHELL WITH BOTTOM NAV ============
class MainShell extends StatefulWidget {
  @override
  _MainShellState createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _tab = 0;
  String authToken = '';
  String username = '';
  String userRole = 'public';
  String fullName = '';
  String? department;

  Map<String, dynamic>? summary;
  List<String> statesList = [];
  List<String> deptsList = [];

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      authToken = prefs.getString('auth_token') ?? '';
      username = prefs.getString('username') ?? '';
      userRole = prefs.getString('role') ?? 'public';
      fullName = prefs.getString('full_name') ?? '';
      department = prefs.getString('department');
    });
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        http.get(Uri.parse('$kBaseUrl/api/summary')),
        http.get(Uri.parse('$kBaseUrl/api/states')),
        http.get(Uri.parse('$kBaseUrl/api/departments')),
      ]);
      if (results[0].statusCode == 200) summary = json.decode(results[0].body);
      if (results[1].statusCode == 200)
        statesList = List<String>.from(
          json.decode(results[1].body)['states'] ?? [],
        );
      if (results[2].statusCode == 200)
        deptsList = List<String>.from(
          json.decode(results[2].body)['departments'] ?? [],
        );
      setState(() {});
    } catch (_) {}
  }

  Map<String, String> get authHeaders => {
    'Authorization': 'Bearer $authToken',
    'Content-Type': 'application/json',
  };

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeTab(
        summary: summary,
        states: statesList,
        depts: deptsList,
        fullName: fullName,
        role: userRole,
        onStateSelect: _goToState,
        onDeptSelect: _goToDept,
      ),
      ExploreTab(
        states: statesList,
        depts: deptsList,
        onStateSelect: _goToState,
        onDeptSelect: _goToDept,
      ),
      MyStateTab(states: statesList, authHeaders: authHeaders),
      ProfileTab(
        fullName: fullName,
        username: username,
        role: userRole,
        dept: department,
        onLogout: _logout,
      ),
    ];
    return Scaffold(
      body: IndexedStack(index: _tab, children: screens),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          border: Border(
            top: BorderSide(color: AppColors.cardLight, width: 0.5),
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navItem(0, Icons.home_rounded, 'Home'),
                _navItem(1, Icons.explore_rounded, 'Explore'),
                _navItem(2, Icons.map_rounded, 'My State'),
                _navItem(3, Icons.person_rounded, 'Profile'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navItem(int idx, IconData icon, String label) {
    final active = _tab == idx;
    return GestureDetector(
      onTap: () => setState(() => _tab = idx),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: Duration(milliseconds: 200),
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: active
              ? AppColors.accent.withOpacity(0.15)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: active ? AppColors.accent : AppColors.muted,
              size: 22,
            ),
            SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: active ? AppColors.accent : AppColors.muted,
                fontWeight: active ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _goToState(String state) {
    setState(() => _tab = 2);
    // The MyStateTab will handle its own state selection
  }

  void _goToDept(String dept) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            DepartmentDetailScreen(dept: dept, authHeaders: authHeaders),
      ),
    );
  }
}

// ============ HOME TAB ============
class HomeTab extends StatelessWidget {
  final Map<String, dynamic>? summary;
  final List<String> states;
  final List<String> depts;
  final String fullName;
  final String role;
  final Function(String) onStateSelect;
  final Function(String) onDeptSelect;

  const HomeTab({
    required this.summary,
    required this.states,
    required this.depts,
    required this.fullName,
    required this.role,
    required this.onStateSelect,
    required this.onDeptSelect,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.compact(locale: 'en_IN');
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Greeting
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Namaste, ${fullName.split(' ').first} 🙏',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        "Here's what India is spending",
                        style: TextStyle(color: AppColors.muted, fontSize: 14),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [AppColors.saffron, AppColors.green],
                    ),
                  ),
                  child: CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.card,
                    child: Text(
                      fullName.isNotEmpty ? fullName[0] : 'U',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 24),

            // India tri-color bar
            Container(
              height: 4,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(2),
                gradient: LinearGradient(
                  colors: [
                    AppColors.saffron,
                    AppColors.saffron,
                    Colors.white,
                    Colors.white,
                    AppColors.green,
                    AppColors.green,
                  ],
                ),
              ),
            ),
            SizedBox(height: 20),

            // Budget Hero Card
            if (summary != null) ...[
              Container(
                width: double.infinity,
                padding: EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  gradient: LinearGradient(
                    colors: [Color(0xFF667eea), Color(0xFF764ba2)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.account_balance,
                          color: Colors.white70,
                          size: 18,
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Total Budget of India',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 8),
                    Text(
                      '₹${fmt.format(summary!['total_allocated_cr'])} Crore',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 16),
                    Row(
                      children: [
                        _heroPill(
                          'Spent',
                          '₹${fmt.format(summary!['total_spent_cr'])}Cr',
                          AppColors.success,
                        ),
                        SizedBox(width: 12),
                        _heroPill(
                          'Utilization',
                          '${summary!['avg_utilization']?.toStringAsFixed(1)}%',
                          AppColors.saffron,
                        ),
                        SizedBox(width: 12),
                        _heroPill(
                          'Waste',
                          '₹${fmt.format(summary!['total_waste_cr'])}Cr',
                          AppColors.danger,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              SizedBox(height: 20),

              // Quick Stats Grid
              Row(
                children: [
                  _quickStat(
                    'States',
                    '${summary!['total_states']}',
                    Icons.map_outlined,
                    AppColors.saffron,
                  ),
                  SizedBox(width: 10),
                  _quickStat(
                    'Districts',
                    '${summary!['total_districts']}',
                    Icons.location_city_outlined,
                    AppColors.blue,
                  ),
                ],
              ),
              SizedBox(height: 10),
              Row(
                children: [
                  _quickStat(
                    'Depts',
                    '${summary!['total_departments']}',
                    Icons.business_outlined,
                    AppColors.accent,
                  ),
                  SizedBox(width: 10),
                  _quickStat(
                    'Underspend',
                    '${summary!['critical_underspend']}',
                    Icons.trending_down,
                    AppColors.danger,
                  ),
                ],
              ),
            ],
            SizedBox(height: 28),

            // Departments section
            _sectionHeader('Departments', Icons.business_rounded),
            SizedBox(height: 12),
            SizedBox(
              height: 100,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: depts.length,
                separatorBuilder: (_, __) => SizedBox(width: 10),
                itemBuilder: (_, i) {
                  final icons = [
                    Icons.local_hospital,
                    Icons.school,
                    Icons.agriculture,
                    Icons.engineering,
                    Icons.directions_railway,
                    Icons.water_drop,
                    Icons.cottage,
                    Icons.security,
                  ];
                  final colors = [
                    Color(0xFF00C9FF),
                    Color(0xFFFF6B6B),
                    Color(0xFF48C774),
                    Color(0xFFFFDD57),
                    Color(0xFFB86BFF),
                    Color(0xFF3B82F6),
                    Color(0xFFEC4899),
                    Color(0xFFF59E0B),
                  ];
                  return GestureDetector(
                    onTap: () => onDeptSelect(depts[i]),
                    child: Container(
                      width: 110,
                      padding: EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: colors[i % colors.length].withOpacity(0.3),
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            icons[i % icons.length],
                            color: colors[i % colors.length],
                            size: 28,
                          ),
                          SizedBox(height: 8),
                          Text(
                            depts[i],
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            SizedBox(height: 28),

            // States section
            _sectionHeader('Popular States', Icons.flag_rounded),
            SizedBox(height: 12),
            ...states.take(6).map((s) => _stateRow(s, () => onStateSelect(s))),
          ],
        ),
      ),
    );
  }

  Widget _heroPill(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
            SizedBox(height: 2),
            Text(label, style: TextStyle(color: Colors.white60, fontSize: 10)),
          ],
        ),
      ),
    );
  }

  Widget _quickStat(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Container(
              padding: EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                ),
                Text(
                  label,
                  style: TextStyle(fontSize: 11, color: AppColors.muted),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppColors.accent, size: 20),
        SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }

  Widget _stateRow(String state, VoidCallback onTap) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(
                Icons.location_on_outlined,
                color: AppColors.saffron,
                size: 18,
              ),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  state,
                  style: TextStyle(fontWeight: FontWeight.w500),
                ),
              ),
              Icon(Icons.chevron_right, color: AppColors.muted, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

// ============ EXPLORE TAB ============
class ExploreTab extends StatefulWidget {
  final List<String> states;
  final List<String> depts;
  final Function(String) onStateSelect;
  final Function(String) onDeptSelect;
  const ExploreTab({
    required this.states,
    required this.depts,
    required this.onStateSelect,
    required this.onDeptSelect,
  });
  @override
  _ExploreTabState createState() => _ExploreTabState();
}

class _ExploreTabState extends State<ExploreTab>
    with SingleTickerProviderStateMixin {
  late TabController _tabC;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _tabC = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabC.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filteredStates = widget.states
        .where((s) => s.toLowerCase().contains(_search.toLowerCase()))
        .toList();
    final filteredDepts = widget.depts
        .where((d) => d.toLowerCase().contains(_search.toLowerCase()))
        .toList();
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Explore',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700),
                ),
                SizedBox(height: 4),
                Text(
                  'Dive into state & department budgets',
                  style: TextStyle(color: AppColors.muted, fontSize: 14),
                ),
                SizedBox(height: 16),
                // Search bar
                TextField(
                  onChanged: (v) => setState(() => _search = v),
                  style: TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search states or departments...',
                    hintStyle: TextStyle(color: AppColors.muted, fontSize: 14),
                    prefixIcon: Icon(
                      Icons.search,
                      color: AppColors.muted,
                      size: 20,
                    ),
                    filled: true,
                    fillColor: AppColors.card,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: 12),
          TabBar(
            controller: _tabC,
            indicatorColor: AppColors.accent,
            labelColor: AppColors.accent,
            unselectedLabelColor: AppColors.muted,
            indicatorSize: TabBarIndicatorSize.label,
            tabs: [
              Tab(text: 'States (${filteredStates.length})'),
              Tab(text: 'Departments (${filteredDepts.length})'),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabC,
              children: [
                // States List
                ListView.builder(
                  padding: EdgeInsets.all(16),
                  itemCount: filteredStates.length,
                  itemBuilder: (_, i) {
                    return Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppColors.saffron.withOpacity(0.15),
                          child: Text(
                            '${i + 1}',
                            style: TextStyle(
                              color: AppColors.saffron,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        title: Text(
                          filteredStates[i],
                          style: TextStyle(fontWeight: FontWeight.w500),
                        ),
                        trailing: Icon(
                          Icons.arrow_forward_ios,
                          size: 14,
                          color: AppColors.muted,
                        ),
                        tileColor: AppColors.card,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                StateDetailScreen(state: filteredStates[i]),
                          ),
                        ),
                      ),
                    );
                  },
                ),
                // Departments List
                ListView.builder(
                  padding: EdgeInsets.all(16),
                  itemCount: filteredDepts.length,
                  itemBuilder: (_, i) {
                    final colors = [
                      Color(0xFF00C9FF),
                      Color(0xFFFF6B6B),
                      Color(0xFF48C774),
                      Color(0xFFFFDD57),
                      Color(0xFFB86BFF),
                      Color(0xFF3B82F6),
                    ];
                    return Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: colors[i % colors.length]
                              .withOpacity(0.15),
                          child: Icon(
                            Icons.business,
                            color: colors[i % colors.length],
                            size: 20,
                          ),
                        ),
                        title: Text(
                          filteredDepts[i],
                          style: TextStyle(fontWeight: FontWeight.w500),
                        ),
                        trailing: Icon(
                          Icons.arrow_forward_ios,
                          size: 14,
                          color: AppColors.muted,
                        ),
                        tileColor: AppColors.card,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        onTap: () => widget.onDeptSelect(filteredDepts[i]),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ============ MY STATE TAB ============
class MyStateTab extends StatefulWidget {
  final List<String> states;
  final Map<String, String> authHeaders;
  const MyStateTab({required this.states, required this.authHeaders});
  @override
  _MyStateTabState createState() => _MyStateTabState();
}

class _MyStateTabState extends State<MyStateTab> {
  String? selectedState;
  List<dynamic> stateData = [];
  bool loading = false;

  void _loadState(String state) async {
    setState(() {
      selectedState = state;
      loading = true;
    });
    try {
      final res = await http.get(Uri.parse('$kBaseUrl/api/state/$state'));
      if (res.statusCode == 200) {
        setState(() => stateData = json.decode(res.body));
      }
    } catch (_) {}
    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    // Aggregate by department
    final deptMap = <String, Map<String, double>>{};
    for (var d in stateData) {
      final dept = d['Department'] ?? 'Unknown';
      deptMap.putIfAbsent(dept, () => {'allocated': 0, 'spent': 0, 'count': 0});
      deptMap[dept]!['allocated'] =
          deptMap[dept]!['allocated']! + (d['allocated'] ?? 0).toDouble();
      deptMap[dept]!['spent'] =
          deptMap[dept]!['spent']! + (d['spent'] ?? 0).toDouble();
      deptMap[dept]!['count'] = deptMap[dept]!['count']! + 1;
    }
    final deptList = deptMap.entries.toList()
      ..sort((a, b) => b.value['allocated']!.compareTo(a.value['allocated']!));
    final totalAlloc = deptList.fold<double>(
      0,
      (s, e) => s + e.value['allocated']!,
    );
    final totalSpent = deptList.fold<double>(
      0,
      (s, e) => s + e.value['spent']!,
    );

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'My State',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700),
                ),
                SizedBox(height: 4),
                Text(
                  'See where your tax money goes',
                  style: TextStyle(color: AppColors.muted, fontSize: 14),
                ),
                SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: selectedState,
                      hint: Text(
                        'Select your state',
                        style: TextStyle(color: AppColors.muted),
                      ),
                      isExpanded: true,
                      dropdownColor: AppColors.card,
                      icon: Icon(
                        Icons.keyboard_arrow_down,
                        color: AppColors.accent,
                      ),
                      items: widget.states
                          .map(
                            (s) => DropdownMenuItem(value: s, child: Text(s)),
                          )
                          .toList(),
                      onChanged: (v) {
                        if (v != null) _loadState(v);
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: 16),
          if (loading)
            Expanded(
              child: Center(
                child: CircularProgressIndicator(color: AppColors.accent),
              ),
            )
          else if (selectedState == null)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.map_outlined,
                      size: 64,
                      color: AppColors.muted.withOpacity(0.3),
                    ),
                    SizedBox(height: 12),
                    Text(
                      'Pick a state to explore',
                      style: TextStyle(color: AppColors.muted),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // State summary card
                    Container(
                      width: double.infinity,
                      padding: EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        gradient: LinearGradient(
                          colors: [Color(0xFF11998e), Color(0xFF38ef7d)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.location_on, color: Colors.white70),
                              SizedBox(width: 8),
                              Text(
                                selectedState!,
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 16),
                          Row(
                            children: [
                              _statePill(
                                'Allocated',
                                '₹${totalAlloc.toStringAsFixed(0)} Cr',
                              ),
                              SizedBox(width: 12),
                              _statePill(
                                'Spent',
                                '₹${totalSpent.toStringAsFixed(0)} Cr',
                              ),
                              SizedBox(width: 12),
                              _statePill(
                                'Districts',
                                '${stateData.map((d) => d['District']).toSet().length}',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 24),

                    // Budget Split (Pie chart)
                    if (deptList.isNotEmpty) ...[
                      Text(
                        'Budget Split by Department',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 12),
                      SizedBox(
                        height: 200,
                        child: PieChart(
                          PieChartData(
                            sectionsSpace: 2,
                            centerSpaceRadius: 40,
                            sections: deptList
                                .take(6)
                                .toList()
                                .asMap()
                                .entries
                                .map((e) {
                                  final pct = totalAlloc > 0
                                      ? (e.value.value['allocated']! /
                                            totalAlloc *
                                            100)
                                      : 0.0;
                                  final colors = [
                                    Color(0xFF6C63FF),
                                    Color(0xFFFF6B6B),
                                    Color(0xFF48C774),
                                    Color(0xFFFFDD57),
                                    Color(0xFF00C9FF),
                                    Color(0xFFEC4899),
                                  ];
                                  return PieChartSectionData(
                                    value: e.value.value['allocated']!,
                                    title: '${pct.toStringAsFixed(0)}%',
                                    color: colors[e.key % colors.length],
                                    radius: 45,
                                    titleStyle: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
                                    ),
                                  );
                                })
                                .toList(),
                          ),
                        ),
                      ),
                      SizedBox(height: 8),
                      Wrap(
                        spacing: 12,
                        runSpacing: 4,
                        children: deptList.take(6).toList().asMap().entries.map(
                          (e) {
                            final colors = [
                              Color(0xFF6C63FF),
                              Color(0xFFFF6B6B),
                              Color(0xFF48C774),
                              Color(0xFFFFDD57),
                              Color(0xFF00C9FF),
                              Color(0xFFEC4899),
                            ];
                            return Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    color: colors[e.key % colors.length],
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                SizedBox(width: 4),
                                Text(
                                  e.value.key,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.muted,
                                  ),
                                ),
                              ],
                            );
                          },
                        ).toList(),
                      ),
                      SizedBox(height: 24),
                    ],

                    // Department Breakdown
                    Text(
                      'Department Breakdown',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    SizedBox(height: 12),
                    ...deptList.map((e) {
                      final pct = e.value['allocated']! > 0
                          ? (e.value['spent']! / e.value['allocated']! * 100)
                          : 0.0;
                      return Padding(
                        padding: EdgeInsets.only(bottom: 10),
                        child: Container(
                          padding: EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.card,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      e.key,
                                      style: TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    '${pct.toStringAsFixed(0)}%',
                                    style: TextStyle(
                                      color: pct < 50
                                          ? AppColors.danger
                                          : pct > 90
                                          ? AppColors.success
                                          : AppColors.saffron,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 8),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: (pct / 100).clamp(0, 1).toDouble(),
                                  backgroundColor: AppColors.cardLight,
                                  color: pct < 50
                                      ? AppColors.danger
                                      : pct > 90
                                      ? AppColors.success
                                      : AppColors.saffron,
                                  minHeight: 6,
                                ),
                              ),
                              SizedBox(height: 6),
                              Row(
                                children: [
                                  Text(
                                    '₹${e.value['allocated']!.toStringAsFixed(0)} Cr alloc',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: AppColors.muted,
                                    ),
                                  ),
                                  Spacer(),
                                  Text(
                                    '₹${e.value['spent']!.toStringAsFixed(0)} Cr spent',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: AppColors.muted,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }),

                    // District Table
                    if (stateData.isNotEmpty) ...[
                      SizedBox(height: 16),
                      Text(
                        'District Details',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 12),
                      ...stateData.take(15).map((d) {
                        final util = (d['utilization'] ?? 0).toDouble();
                        return Padding(
                          padding: EdgeInsets.only(bottom: 6),
                          child: Container(
                            padding: EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.card,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${d['District']}',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w500,
                                          fontSize: 13,
                                        ),
                                      ),
                                      Text(
                                        '${d['Department']}',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: AppColors.muted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      '${util.toStringAsFixed(0)}%',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14,
                                        color: util < 50
                                            ? AppColors.danger
                                            : util > 90
                                            ? AppColors.success
                                            : AppColors.saffron,
                                      ),
                                    ),
                                    Text(
                                      '₹${(d['allocated'] ?? 0).toStringAsFixed(0)} Cr',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: AppColors.muted,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                      if (stateData.length > 15)
                        Padding(
                          padding: EdgeInsets.only(top: 8),
                          child: Text(
                            '+ ${stateData.length - 15} more districts',
                            style: TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                            ),
                          ),
                        ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _statePill(String label, String value) {
    return Expanded(
      child: Container(
        padding: EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
            SizedBox(height: 2),
            Text(label, style: TextStyle(color: Colors.white60, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

// ============ STATE DETAIL SCREEN ============
class StateDetailScreen extends StatefulWidget {
  final String state;
  const StateDetailScreen({required this.state});
  @override
  _StateDetailScreenState createState() => _StateDetailScreenState();
}

class _StateDetailScreenState extends State<StateDetailScreen> {
  List<dynamic> data = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() async {
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/state/${widget.state}'),
      );
      if (res.statusCode == 200) data = json.decode(res.body);
    } catch (_) {}
    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    // Aggregate
    final deptMap = <String, Map<String, double>>{};
    for (var d in data) {
      final dept = d['Department'] ?? 'Unknown';
      deptMap.putIfAbsent(dept, () => {'allocated': 0, 'spent': 0});
      deptMap[dept]!['allocated'] =
          deptMap[dept]!['allocated']! + (d['allocated'] ?? 0).toDouble();
      deptMap[dept]!['spent'] =
          deptMap[dept]!['spent']! + (d['spent'] ?? 0).toDouble();
    }
    final deptList = deptMap.entries.toList()
      ..sort((a, b) => b.value['allocated']!.compareTo(a.value['allocated']!));
    final totalAlloc = deptList.fold<double>(
      0,
      (s, e) => s + e.value['allocated']!,
    );
    final totalSpent = deptList.fold<double>(
      0,
      (s, e) => s + e.value['spent']!,
    );
    final util = totalAlloc > 0 ? (totalSpent / totalAlloc * 100) : 0.0;

    return Scaffold(
      appBar: AppBar(title: Text(widget.state)),
      body: loading
          ? Center(child: CircularProgressIndicator(color: AppColors.accent))
          : SingleChildScrollView(
              padding: EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Summary
                  Container(
                    width: double.infinity,
                    padding: EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFFf12711), Color(0xFFf5af19)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.state,
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(height: 12),
                        Row(
                          children: [
                            _pill(
                              'Allocated',
                              '₹${totalAlloc.toStringAsFixed(0)} Cr',
                            ),
                            SizedBox(width: 8),
                            _pill(
                              'Spent',
                              '₹${totalSpent.toStringAsFixed(0)} Cr',
                            ),
                            SizedBox(width: 8),
                            _pill('Utilization', '${util.toStringAsFixed(0)}%'),
                          ],
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 24),

                  // Bar chart
                  if (deptList.isNotEmpty) ...[
                    Text(
                      'Budget vs Spent by Department',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    SizedBox(height: 12),
                    SizedBox(
                      height: 220,
                      child: BarChart(
                        BarChartData(
                          barGroups: deptList
                              .take(5)
                              .toList()
                              .asMap()
                              .entries
                              .map((e) {
                                return BarChartGroupData(
                                  x: e.key,
                                  barRods: [
                                    BarChartRodData(
                                      toY: e.value.value['allocated']!,
                                      color: AppColors.blue,
                                      width: 12,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    BarChartRodData(
                                      toY: e.value.value['spent']!,
                                      color: AppColors.success,
                                      width: 12,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                  ],
                                );
                              })
                              .toList(),
                          borderData: FlBorderData(show: false),
                          gridData: FlGridData(show: false),
                          titlesData: FlTitlesData(
                            leftTitles: AxisTitles(
                              sideTitles: SideTitles(showTitles: false),
                            ),
                            rightTitles: AxisTitles(
                              sideTitles: SideTitles(showTitles: false),
                            ),
                            topTitles: AxisTitles(
                              sideTitles: SideTitles(showTitles: false),
                            ),
                            bottomTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                getTitlesWidget: (v, _) {
                                  final idx = v.toInt();
                                  if (idx < deptList.length) {
                                    final name = deptList[idx].key;
                                    return Padding(
                                      padding: EdgeInsets.only(top: 8),
                                      child: Text(
                                        name.length > 8
                                            ? '${name.substring(0, 8)}..'
                                            : name,
                                        style: TextStyle(
                                          fontSize: 9,
                                          color: AppColors.muted,
                                        ),
                                      ),
                                    );
                                  }
                                  return Text('');
                                },
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    SizedBox(height: 8),
                    Row(
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: AppColors.blue,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        SizedBox(width: 4),
                        Text(
                          'Allocated',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.muted,
                          ),
                        ),
                        SizedBox(width: 16),
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: AppColors.success,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        SizedBox(width: 4),
                        Text(
                          'Spent',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.muted,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 24),
                  ],

                  // Department cards
                  Text(
                    'All Departments',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  SizedBox(height: 12),
                  ...deptList.map((e) {
                    final pct = e.value['allocated']! > 0
                        ? (e.value['spent']! / e.value['allocated']! * 100)
                        : 0.0;
                    return Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: Container(
                        padding: EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    e.key,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                Text(
                                  '${pct.toStringAsFixed(0)}%',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: pct < 50
                                        ? AppColors.danger
                                        : pct > 90
                                        ? AppColors.success
                                        : AppColors.saffron,
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(3),
                              child: LinearProgressIndicator(
                                value: (pct / 100).clamp(0, 1).toDouble(),
                                backgroundColor: AppColors.cardLight,
                                minHeight: 5,
                                color: pct < 50
                                    ? AppColors.danger
                                    : pct > 90
                                    ? AppColors.success
                                    : AppColors.saffron,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              '₹${e.value['allocated']!.toStringAsFixed(0)} Cr → ₹${e.value['spent']!.toStringAsFixed(0)} Cr spent',
                              style: TextStyle(
                                fontSize: 11,
                                color: AppColors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }

  Widget _pill(String label, String value) {
    return Expanded(
      child: Container(
        padding: EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
            SizedBox(height: 2),
            Text(label, style: TextStyle(color: Colors.white60, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

// ============ DEPARTMENT DETAIL SCREEN ============
class DepartmentDetailScreen extends StatefulWidget {
  final String dept;
  final Map<String, String> authHeaders;
  const DepartmentDetailScreen({required this.dept, required this.authHeaders});
  @override
  _DepartmentDetailScreenState createState() => _DepartmentDetailScreenState();
}

class _DepartmentDetailScreenState extends State<DepartmentDetailScreen> {
  List<dynamic> data = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() async {
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/department/${widget.dept}'),
        headers: widget.authHeaders,
      );
      if (res.statusCode == 200) {
        data = json.decode(res.body);
      } else if (res.statusCode == 401 || res.statusCode == 403) {
        error = 'Login required to view department details';
      }
    } catch (_) {
      error = 'Could not load data';
    }
    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    data.sort(
      (a, b) => ((b['total_allocated'] ?? 0) as num).compareTo(
        (a['total_allocated'] ?? 0) as num,
      ),
    );
    final totalAlloc = data.fold<double>(
      0,
      (s, e) => s + ((e['total_allocated'] ?? 0) as num).toDouble(),
    );
    final totalSpent = data.fold<double>(
      0,
      (s, e) => s + ((e['total_spent'] ?? 0) as num).toDouble(),
    );

    return Scaffold(
      appBar: AppBar(title: Text(widget.dept)),
      body: loading
          ? Center(child: CircularProgressIndicator(color: AppColors.accent))
          : error != null
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.lock_outline, size: 48, color: AppColors.muted),
                  SizedBox(height: 12),
                  Text(error!, style: TextStyle(color: AppColors.muted)),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF6C63FF), Color(0xFFB86BFF)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.dept,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          '${data.length} state-district combinations',
                          style: TextStyle(color: Colors.white60, fontSize: 12),
                        ),
                        SizedBox(height: 12),
                        Row(
                          children: [
                            _dPill(
                              'Allocated',
                              '₹${totalAlloc.toStringAsFixed(0)} Cr',
                            ),
                            SizedBox(width: 8),
                            _dPill(
                              'Spent',
                              '₹${totalSpent.toStringAsFixed(0)} Cr',
                            ),
                            SizedBox(width: 8),
                            _dPill(
                              'Util',
                              '${totalAlloc > 0 ? (totalSpent / totalAlloc * 100).toStringAsFixed(0) : 0}%',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 24),
                  Text(
                    'By State & District',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  SizedBox(height: 12),
                  ...data.take(20).map((d) {
                    final util = (d['avg_utilization'] ?? 0).toDouble();
                    final anomalies = (d['anomaly_count'] ?? 0);
                    return Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: Container(
                        padding: EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(12),
                          border: anomalies > 0
                              ? Border.all(
                                  color: AppColors.danger.withOpacity(0.4),
                                )
                              : null,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${d['State']}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                    ),
                                  ),
                                  Text(
                                    '${d['District']}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.muted,
                                    ),
                                  ),
                                  if (anomalies > 0)
                                    Padding(
                                      padding: EdgeInsets.only(top: 4),
                                      child: Container(
                                        padding: EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppColors.danger.withOpacity(
                                            0.15,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            4,
                                          ),
                                        ),
                                        child: Text(
                                          '$anomalies anomalies',
                                          style: TextStyle(
                                            fontSize: 10,
                                            color: AppColors.danger,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '${util.toStringAsFixed(0)}%',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: util < 50
                                        ? AppColors.danger
                                        : util > 90
                                        ? AppColors.success
                                        : AppColors.saffron,
                                  ),
                                ),
                                Text(
                                  '₹${((d['total_allocated'] ?? 0) as num).toStringAsFixed(0)} Cr',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.muted,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  if (data.length > 20)
                    Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text(
                        '+ ${data.length - 20} more',
                        style: TextStyle(color: AppColors.muted, fontSize: 12),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _dPill(String label, String value) {
    return Expanded(
      child: Container(
        padding: EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
            SizedBox(height: 2),
            Text(label, style: TextStyle(color: Colors.white60, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

// ============ PROFILE TAB ============
class ProfileTab extends StatelessWidget {
  final String fullName;
  final String username;
  final String role;
  final String? dept;
  final VoidCallback onLogout;
  const ProfileTab({
    required this.fullName,
    required this.username,
    required this.role,
    this.dept,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.all(24),
        child: Column(
          children: [
            SizedBox(height: 20),
            Container(
              padding: EdgeInsets.all(4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [AppColors.accent, Color(0xFFB86BFF)],
                ),
              ),
              child: CircleAvatar(
                radius: 48,
                backgroundColor: AppColors.card,
                child: Text(
                  fullName.isNotEmpty ? fullName[0] : 'U',
                  style: TextStyle(fontSize: 36, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            SizedBox(height: 16),
            Text(
              fullName,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            ),
            SizedBox(height: 4),
            Text('@$username', style: TextStyle(color: AppColors.muted)),
            SizedBox(height: 12),
            Container(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: _roleColor(role).withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                role.toUpperCase(),
                style: TextStyle(
                  color: _roleColor(role),
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                  letterSpacing: 1,
                ),
              ),
            ),
            if (dept != null) ...[
              SizedBox(height: 8),
              Text(
                'Department: $dept',
                style: TextStyle(color: AppColors.muted, fontSize: 13),
              ),
            ],
            SizedBox(height: 40),
            _profileItem(
              Icons.info_outline,
              'About',
              'Budget Intelligence Platform',
            ),
            _profileItem(
              Icons.shield_outlined,
              'Data Source',
              'Government of India Open Budget',
            ),
            _profileItem(Icons.code, 'Version', '1.0.0 (Hackathon Build)'),
            SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: onLogout,
                icon: Icon(Icons.logout, size: 18),
                label: Text('Sign Out'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.danger,
                  side: BorderSide(color: AppColors.danger.withOpacity(0.4)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _roleColor(String r) {
    switch (r) {
      case 'admin':
        return AppColors.danger;
      case 'department':
        return AppColors.blue;
      default:
        return AppColors.accent;
    }
  }

  Widget _profileItem(IconData icon, String title, String sub) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8),
      child: Container(
        padding: EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.muted, size: 20),
            SizedBox(width: 14),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                ),
                Text(
                  sub,
                  style: TextStyle(fontSize: 12, color: AppColors.muted),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
