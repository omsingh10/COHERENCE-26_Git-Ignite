import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fl_chart/fl_chart.dart';

const String kBaseUrl = 'http://192.168.22.222:8000';

// ============ COLORS ============
class C {
  static const bg = Color(0xFFF8F9FA);
  static const white = Color(0xFFFFFFFF);
  static const card = Color(0xFFFFFFFF);
  static const orange = Color(0xFFFF6B35);
  static const orangeLight = Color(0xFFFFF0EB);
  static const dark = Color(0xFF1A1A2E);
  static const muted = Color(0xFF6B7280);
  static const mutedLight = Color(0xFFF3F4F6);
  static const success = Color(0xFF27AE60);
  static const successLight = Color(0xFFE8F8F0);
  static const danger = Color(0xFFEF4444);
  static const dangerLight = Color(0xFFFEE2E2);
  static const amber = Color(0xFFF59E0B);
  static const amberLight = Color(0xFFFEF3C7);
  static const blue = Color(0xFF3B82F6);
  static const blueLight = Color(0xFFEFF6FF);
  static const border = Color(0xFFE5E7EB);
  static const saffron = Color(0xFFFF9933);
  static const indigo = Color(0xFF6366F1);
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const HisabKitabApp());
}

class HisabKitabApp extends StatelessWidget {
  const HisabKitabApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hisab Kitab',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: C.bg,
        primaryColor: C.orange,
        colorScheme: const ColorScheme.light(
          primary: C.orange,
          surface: C.white,
        ),
        fontFamily: 'Roboto',
        appBarTheme: const AppBarTheme(
          backgroundColor: C.white,
          elevation: 0,
          foregroundColor: C.dark,
          systemOverlayStyle: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.dark,
          ),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

// ============ AUTH GATE ============
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    final prefs = await SharedPreferences.getInstance();
    final t = prefs.getString('auth_token') ?? '';
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => t.isNotEmpty ? const MainShell() : const LoginScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => const Scaffold(
    backgroundColor: C.bg,
    body: Center(child: CircularProgressIndicator(color: C.orange)),
  );
}

// ============ LOGIN SCREEN ============
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _userC = TextEditingController();
  final _passC = TextEditingController();
  bool _loading = false, _obscure = true;
  String? _error;
  @override
  void dispose() {
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
          .timeout(const Duration(seconds: 10));
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
          MaterialPageRoute(builder: (_) => const MainShell()),
        );
      } else if (res.statusCode == 401) {
        setState(() => _error = 'Invalid username or password');
      } else {
        setState(() => _error = 'Server error (${res.statusCode})');
      }
    } catch (_) {
      setState(() => _error = 'Cannot connect to server');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo row
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: C.orange,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.account_balance,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Hisab Kitab',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: C.orange,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
              const Text(
                'Welcome back!',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: C.dark,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                "India's Budget Intelligence Platform",
                style: TextStyle(fontSize: 14, color: C.muted),
              ),
              const SizedBox(height: 36),
              _field('Username', Icons.person_outline, _userC, false),
              const SizedBox(height: 14),
              _field('Password', Icons.lock_outline, _passC, true),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _login,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: C.orange,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Sign In',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: C.dangerLight,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Color(0x4DEF4444)),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: C.danger,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(color: C.danger, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: C.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: C.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 4,
                          height: 16,
                          decoration: BoxDecoration(
                            color: C.orange,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Quick Login',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: C.orange,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    _demoBtn(
                      'admin',
                      'Admin — Full Access',
                      Icons.admin_panel_settings,
                      C.indigo,
                    ),
                    _demoBtn(
                      'public_user',
                      'Citizen — Public View',
                      Icons.people_outline,
                      C.blue,
                    ),
                    _demoBtn(
                      'health_dept',
                      'Health Dept Officer',
                      Icons.local_hospital_outlined,
                      C.success,
                    ),
                    _demoBtn(
                      'education_dept',
                      'Education Dept Officer',
                      Icons.school_outlined,
                      C.amber,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Password: admin123 for all',
                      style: TextStyle(
                        fontSize: 11,
                        color: C.muted,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(
    String hint,
    IconData icon,
    TextEditingController c,
    bool pass,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: C.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: C.border),
      ),
      child: TextField(
        controller: c,
        obscureText: pass && _obscure,
        style: const TextStyle(fontSize: 14, color: C.dark),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: C.muted, fontSize: 14),
          prefixIcon: Icon(icon, color: C.muted, size: 20),
          suffixIcon: pass
              ? IconButton(
                  icon: Icon(
                    _obscure ? Icons.visibility_off : Icons.visibility,
                    color: C.muted,
                    size: 20,
                  ),
                  onPressed: () => setState(() => _obscure = !_obscure),
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
        ),
        onSubmitted: pass ? (_) => _login() : null,
        textInputAction: pass ? TextInputAction.done : TextInputAction.next,
      ),
    );
  }

  Widget _demoBtn(String user, String label, IconData icon, Color clr) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () {
          _userC.text = user;
          _passC.text = 'admin123';
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
          decoration: BoxDecoration(
            color: clr.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Icon(icon, color: clr, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    color: clr,
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
              ),
              const Icon(Icons.arrow_forward_ios, size: 12, color: C.muted),
            ],
          ),
        ),
      ),
    );
  }
}

// ============ MAIN SHELL ============
class MainShell extends StatefulWidget {
  const MainShell({super.key});
  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _tab = 0;
  String token = '', username = '', role = 'public', fullName = '';
  String? department;
  Map<String, dynamic>? summary;
  List<dynamic> deptSummary = [];
  bool dataLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    token = prefs.getString('auth_token') ?? '';
    username = prefs.getString('username') ?? '';
    role = prefs.getString('role') ?? 'public';
    fullName = prefs.getString('full_name') ?? username;
    department = prefs.getString('department');
    await _fetchData();
  }

  Future<void> _fetchData() async {
    try {
      final results = await Future.wait([
        http.get(Uri.parse('$kBaseUrl/api/summary')),
        http.get(Uri.parse('$kBaseUrl/api/dept-summary')),
      ]);
      if (!mounted) return;
      setState(() {
        if (results[0].statusCode == 200) {
          summary = json.decode(results[0].body);
        }
        if (results[1].statusCode == 200) {
          deptSummary = json.decode(results[1].body) as List;
        }
        dataLoaded = true;
      });
    } catch (_) {
      if (mounted) setState(() => dataLoaded = true);
    }
  }

  Map<String, String> get _headers => {'Authorization': 'Bearer $token'};

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!dataLoaded) {
      return const Scaffold(
        backgroundColor: C.bg,
        body: Center(child: CircularProgressIndicator(color: C.orange)),
      );
    }
    final pages = [
      DashboardScreen(
        summary: summary,
        deptSummary: deptSummary,
        fullName: fullName,
        role: role,
        onTabChange: (i) => setState(() => _tab = i),
      ),
      AnalyticsScreen(headers: _headers),
      AnomaliesScreen(headers: _headers, role: role, department: department),
      AlertsScreen(token: token),
      ProfileScreen(
        fullName: fullName,
        username: username,
        role: role,
        department: department,
        onLogout: _logout,
      ),
    ];
    const navItems = [
      _NavItem(Icons.dashboard_rounded, 'Dashboard'),
      _NavItem(Icons.bar_chart_rounded, 'Analytics'),
      _NavItem(Icons.warning_amber_rounded, 'Anomalies'),
      _NavItem(Icons.notifications_rounded, 'Alerts'),
      _NavItem(Icons.person_rounded, 'Profile'),
    ];
    return Scaffold(
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: _BottomNav(
        selected: _tab,
        items: navItems,
        onTap: (i) => setState(() => _tab = i),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  const _NavItem(this.icon, this.label);
}

class _BottomNav extends StatelessWidget {
  final int selected;
  final List<_NavItem> items;
  final ValueChanged<int> onTap;
  const _BottomNav({
    required this.selected,
    required this.items,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: C.white,
        border: Border(top: BorderSide(color: C.border)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (i) {
              final active = i == selected;
              return GestureDetector(
                onTap: () => onTap(i),
                behavior: HitTestBehavior.opaque,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: active
                        ? const Color(0xFFFFF0EB)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        items[i].icon,
                        color: active ? C.orange : C.muted,
                        size: 22,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        items[i].label,
                        style: TextStyle(
                          fontSize: 10,
                          color: active ? C.orange : C.muted,
                          fontWeight: active
                              ? FontWeight.w700
                              : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

// ======= SHARED HELPER WIDGETS =======
Widget wCard({
  required Widget child,
  EdgeInsets? padding,
  Color? color,
  Color? borderColor,
}) {
  return Container(
    padding: padding ?? const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: color ?? C.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: borderColor ?? C.border),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ],
    ),
    child: child,
  );
}

Widget wKpiCard(
  String label,
  String value,
  IconData icon,
  Color color, {
  String? sub,
}) {
  return Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: C.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: C.border),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ],
    ),
    child: Row(
      children: [
        Container(
          width: 4,
          height: 54,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, color: C.muted)),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: C.dark,
                ),
              ),
              if (sub != null)
                Text(sub, style: TextStyle(fontSize: 12, color: color)),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
      ],
    ),
  );
}

// ============ DASHBOARD ============
class DashboardScreen extends StatelessWidget {
  final Map<String, dynamic>? summary;
  final List<dynamic> deptSummary;
  final String fullName, role;
  final ValueChanged<int> onTabChange;
  const DashboardScreen({
    super.key,
    required this.summary,
    required this.deptSummary,
    required this.fullName,
    required this.role,
    required this.onTabChange,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.compact(locale: 'en_IN');
    final totalAlloc = (summary?['total_allocated_cr'] ?? 0).toDouble();
    final totalSpent = (summary?['total_spent_cr'] ?? 0).toDouble();
    final avgUtil = (summary?['avg_utilization'] ?? 0).toDouble();
    final flagged =
        ((summary?['critical_overspend'] ?? 0) +
        (summary?['critical_underspend'] ?? 0));

    return Scaffold(
      backgroundColor: C.bg,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: C.orange,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.account_balance,
                        color: Colors.white,
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Hisab Kitab',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: C.dark,
                          ),
                        ),
                        const Text(
                          'Budget Intelligence',
                          style: TextStyle(fontSize: 10, color: C.muted),
                        ),
                      ],
                    ),
                    const Spacer(),
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: const Color(0xFFFFF0EB),
                      child: Text(
                        fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U',
                        style: const TextStyle(
                          color: C.orange,
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Dashboard Overview',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: C.dark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      "India's fund allocation at a glance",
                      style: TextStyle(fontSize: 14, color: C.muted),
                    ),
                    const SizedBox(height: 20),

                    // KPI cards
                    wKpiCard(
                      'Total Allocation',
                      '${chr(8377)}${fmt.format(totalAlloc)} Cr',
                      Icons.account_balance,
                      C.orange,
                    ),
                    const SizedBox(height: 10),
                    wKpiCard(
                      'Total Spending',
                      '${chr(8377)}${fmt.format(totalSpent)} Cr',
                      Icons.payments_outlined,
                      C.blue,
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _miniKpi(
                            'Utilization',
                            '${avgUtil.toStringAsFixed(1)}%',
                            Icons.donut_large,
                            C.success,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _miniKpi(
                            'Flagged',
                            '$flagged',
                            Icons.warning_amber_rounded,
                            C.danger,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Bar chart
                    const Text(
                      'Allocation vs Spending',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: C.dark,
                      ),
                    ),
                    const SizedBox(height: 12),
                    wCard(
                      child: Column(
                        children: [
                          deptSummary.isEmpty
                              ? const SizedBox(
                                  height: 160,
                                  child: Center(
                                    child: CircularProgressIndicator(
                                      color: C.orange,
                                      strokeWidth: 2,
                                    ),
                                  ),
                                )
                              : _DeptBarChart(data: deptSummary),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _lgdDot(C.orange, 'Allocated'),
                              const SizedBox(width: 16),
                              _lgdDot(C.blue, 'Spent'),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Action button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: () => onTabChange(1),
                        icon: const Icon(
                          Icons.analytics_outlined,
                          size: 20,
                          color: Colors.white,
                        ),
                        label: const Text(
                          'RUN FULL ANALYSIS',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: C.orange,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Quick stats
                    const Text(
                      'Quick Stats',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: C.dark,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _statPill(
                            'States',
                            '${summary?["total_states"] ?? 0}',
                            Icons.map_outlined,
                            C.saffron,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _statPill(
                            'Districts',
                            '${summary?["total_districts"] ?? 0}',
                            Icons.location_city_outlined,
                            C.indigo,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _statPill(
                            'Depts',
                            '${summary?["total_departments"] ?? 0}',
                            Icons.business_outlined,
                            C.blue,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _statPill(
                            'Ministries',
                            '${summary?["total_ministries"] ?? 0}',
                            Icons.account_balance_outlined,
                            C.success,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Regional view
                    const Text(
                      'Regional View',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: C.dark,
                      ),
                    ),
                    const SizedBox(height: 12),
                    InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const RegionalMapScreen(),
                        ),
                      ),
                      child: wCard(
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.map_rounded,
                                color: C.blue,
                                size: 28,
                              ),
                            ),
                            const SizedBox(width: 16),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'State-wise Budget Map',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: C.dark,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'View allocation & spending by state',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: C.muted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(
                              Icons.chevron_right,
                              color: C.muted,
                              size: 20,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String chr(int code) => String.fromCharCode(code);

  Widget _miniKpi(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 12, color: C.muted)),
        ],
      ),
    );
  }

  Widget _statPill(String label, String value, IconData icon, Color color) {
    return wCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: C.dark,
                ),
              ),
              Text(label, style: const TextStyle(fontSize: 11, color: C.muted)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _lgdDot(Color color, String label) => Row(
    children: [
      Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(3),
        ),
      ),
      const SizedBox(width: 6),
      Text(label, style: const TextStyle(fontSize: 12, color: C.muted)),
    ],
  );
}

class _DeptBarChart extends StatelessWidget {
  final List<dynamic> data;
  const _DeptBarChart({required this.data});
  @override
  Widget build(BuildContext context) {
    final rows = data.take(6).toList();
    final maxVal = rows.fold<double>(0.0, (m, d) {
      final v = (d['allocated'] as num).toDouble();
      return v > m ? v : m;
    });
    return SizedBox(
      height: 180,
      child: BarChart(
        BarChartData(
          maxY: maxVal * 1.2,
          barTouchData: BarTouchData(
            touchTooltipData: BarTouchTooltipData(
              getTooltipItem: (group, gi, rod, ri) {
                final dept = (rows[group.x]['Department'] as String)
                    .split(' ')
                    .first;
                return BarTooltipItem(
                  '$dept\n${chr(8377)}${(rod.toY / 1000).toStringAsFixed(1)}K Cr',
                  const TextStyle(color: Colors.white, fontSize: 11),
                );
              },
            ),
          ),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 24,
                getTitlesWidget: (val, _) {
                  final i = val.toInt();
                  if (i < 0 || i >= rows.length) return const SizedBox();
                  final name = (rows[i]['Department'] as String)
                      .split(' ')
                      .first;
                  return Text(
                    name.length > 5 ? name.substring(0, 5) : name,
                    style: const TextStyle(fontSize: 9, color: C.muted),
                  );
                },
              ),
            ),
            leftTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
          ),
          borderData: FlBorderData(show: false),
          gridData: const FlGridData(show: false),
          barGroups: List.generate(rows.length, (i) {
            final alloc = (rows[i]['allocated'] as num).toDouble();
            final spent = (rows[i]['spent'] as num).toDouble();
            return BarChartGroupData(
              x: i,
              barsSpace: 3,
              barRods: [
                BarChartRodData(
                  toY: alloc,
                  color: C.orange,
                  width: 10,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(4),
                  ),
                ),
                BarChartRodData(
                  toY: spent,
                  color: C.blue,
                  width: 10,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(4),
                  ),
                ),
              ],
            );
          }),
        ),
      ),
    );
  }

  static String chr(int code) => String.fromCharCode(code);
}

// ============ ANALYTICS SCREEN ============
class AnalyticsScreen extends StatefulWidget {
  final Map<String, String> headers;
  const AnalyticsScreen({super.key, required this.headers});
  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  List<dynamic> states = [];
  bool loading = true;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await http.get(Uri.parse('$kBaseUrl/api/states-summary'));
      if (r.statusCode == 200 && mounted) {
        setState(() {
          states = json.decode(r.body) as List;
          loading = false;
        });
      } else if (mounted) {
        setState(() => loading = false);
      }
    } catch (_) {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.compact(locale: 'en_IN');
    return Scaffold(
      backgroundColor: C.bg,
      appBar: AppBar(
        title: const Text('Analytics'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: C.border),
        ),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: C.orange))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'State-wise Analysis',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: C.dark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Spending efficiency across India',
                    style: TextStyle(fontSize: 14, color: C.muted),
                  ),
                  const SizedBox(height: 20),

                  wCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Utilization Distribution',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: C.dark,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _UtilBar(data: states),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'States by Allocation',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: C.dark,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...states.take(20).map((s) => _StateRow(state: s, fmt: fmt)),
                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }
}

class _UtilBar extends StatelessWidget {
  final List<dynamic> data;
  const _UtilBar({required this.data});
  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox(height: 40);
    int high = 0, med = 0, low = 0;
    for (final s in data) {
      final u = (s['utilization'] as num).toDouble();
      if (u >= 80) {
        high++;
      } else if (u >= 50) {
        med++;
      } else {
        low++;
      }
    }
    final total = data.length;
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: Row(
            children: [
              _seg(high / total, C.success),
              _seg(med / total, C.amber),
              _seg(low / total, C.danger),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _lgd(C.success, 'High (${high}s)'),
            _lgd(C.amber, 'Medium (${med}s)'),
            _lgd(C.danger, 'Low (${low}s)'),
          ],
        ),
      ],
    );
  }

  Widget _seg(double frac, Color c) => Expanded(
    flex: (frac * 100).toInt().clamp(1, 100),
    child: Container(height: 28, color: c),
  );
  Widget _lgd(Color c, String l) => Row(
    children: [
      Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(
          color: c,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
      const SizedBox(width: 4),
      Text(
        l,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
      ),
    ],
  );
}

class _StateRow extends StatelessWidget {
  final dynamic state;
  final NumberFormat fmt;
  const _StateRow({required this.state, required this.fmt});
  @override
  Widget build(BuildContext context) {
    final util = (state['utilization'] as num).toDouble();
    final color = util >= 80
        ? C.success
        : util >= 50
        ? C.amber
        : C.danger;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => StateDetailScreen(state: state['State']),
          ),
        ),
        child: wCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      state['State'],
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: C.dark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${chr(8377)}${fmt.format((state["allocated"] as num).toDouble())} Cr allocated',
                      style: const TextStyle(fontSize: 12, color: C.muted),
                    ),
                    const SizedBox(height: 6),
                    LinearProgressIndicator(
                      value: (util / 100).clamp(0.0, 1.5),
                      color: color,
                      backgroundColor: color.withValues(alpha: 0.15),
                      minHeight: 6,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${util.toStringAsFixed(1)}%',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String chr(int code) => String.fromCharCode(code);
}

// ============ STATE DETAIL ============
class StateDetailScreen extends StatefulWidget {
  final String state;
  const StateDetailScreen({super.key, required this.state});
  @override
  State<StateDetailScreen> createState() => _StateDetailScreenState();
}

class _StateDetailScreenState extends State<StateDetailScreen> {
  List<dynamic> data = [];
  bool loading = true;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await http.get(
        Uri.parse('$kBaseUrl/api/state/${Uri.encodeComponent(widget.state)}'),
      );
      if (r.statusCode == 200 && mounted) {
        setState(() {
          data = json.decode(r.body) as List;
          loading = false;
        });
      } else if (mounted) {
        setState(() => loading = false);
      }
    } catch (_) {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final deptMap = <String, Map<String, double>>{};
    for (final d in data) {
      final dept = d['Department'] ?? 'Unknown';
      deptMap.putIfAbsent(dept, () => {'allocated': 0, 'spent': 0});
      deptMap[dept]!['allocated'] =
          deptMap[dept]!['allocated']! + (d['allocated'] as num).toDouble();
      deptMap[dept]!['spent'] =
          deptMap[dept]!['spent']! + (d['spent'] as num).toDouble();
    }
    final deptList = deptMap.entries.toList()
      ..sort((a, b) => b.value['allocated']!.compareTo(a.value['allocated']!));
    final fmt = NumberFormat.compact(locale: 'en_IN');
    return Scaffold(
      backgroundColor: C.bg,
      appBar: AppBar(
        title: Text(widget.state),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: C.border),
        ),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: C.orange))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: deptList.map((e) {
                  final alloc = e.value['allocated'] ?? 0.0;
                  final spent = e.value['spent'] ?? 0.0;
                  final util = alloc > 0
                      ? (spent / alloc * 100).clamp(0.0, 200.0)
                      : 0.0;
                  final c = util >= 80
                      ? C.success
                      : util >= 50
                      ? C.amber
                      : C.danger;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: wCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            e.key,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: C.dark,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: _dv(
                                  'Allocated',
                                  '${chr(8377)}${fmt.format(alloc)} Cr',
                                  C.orange,
                                ),
                              ),
                              Expanded(
                                child: _dv(
                                  'Spent',
                                  '${chr(8377)}${fmt.format(spent)} Cr',
                                  C.blue,
                                ),
                              ),
                              Expanded(
                                child: _dv(
                                  'Util.',
                                  '${util.toStringAsFixed(1)}%',
                                  c,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          LinearProgressIndicator(
                            value: (util / 100).clamp(0.0, 1.5),
                            color: c,
                            backgroundColor: c.withValues(alpha: 0.15),
                            minHeight: 6,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
    );
  }

  Widget _dv(String l, String v, Color c) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(l, style: const TextStyle(fontSize: 11, color: C.muted)),
      Text(
        v,
        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: c),
      ),
    ],
  );
  static String chr(int code) => String.fromCharCode(code);
}

// ============ REGIONAL MAP SCREEN ============
class RegionalMapScreen extends StatefulWidget {
  const RegionalMapScreen({super.key});
  @override
  State<RegionalMapScreen> createState() => _RegionalMapScreenState();
}

class _RegionalMapScreenState extends State<RegionalMapScreen> {
  List<dynamic> states = [];
  bool loading = true;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await http.get(Uri.parse('$kBaseUrl/api/states-summary'));
      if (r.statusCode == 200 && mounted) {
        setState(() {
          states = json.decode(r.body) as List;
          loading = false;
        });
      } else if (mounted) {
        setState(() => loading = false);
      }
    } catch (_) {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.compact(locale: 'en_IN');
    return Scaffold(
      backgroundColor: C.bg,
      appBar: AppBar(
        title: const Text('Regional View'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: C.border),
        ),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: C.orange))
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: wCard(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _lgd(C.success, 'High (>=80%)'),
                        _lgd(C.amber, 'Medium'),
                        _lgd(C.danger, 'Low (<50%)'),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: states.length,
                    itemBuilder: (_, i) {
                      final s = states[i];
                      final util = (s['utilization'] as num).toDouble();
                      final color = util >= 80
                          ? C.success
                          : util >= 50
                          ? C.amber
                          : C.danger;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) =>
                                  StateDetailScreen(state: s['State']),
                            ),
                          ),
                          child: wCard(
                            child: Row(
                              children: [
                                Container(
                                  width: 6,
                                  height: 54,
                                  decoration: BoxDecoration(
                                    color: color,
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        s['State'],
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: C.dark,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${s["district_count"]} districts • ${chr(8377)}${fmt.format((s["allocated"] as num).toDouble())} Cr',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: C.muted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      '${util.toStringAsFixed(1)}%',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                        color: color,
                                        fontSize: 15,
                                      ),
                                    ),
                                    const Text(
                                      'utilization',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: C.muted,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(width: 4),
                                const Icon(
                                  Icons.chevron_right,
                                  color: C.muted,
                                  size: 18,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }

  Widget _lgd(Color c, String l) => Row(
    children: [
      Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(
          color: c,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
      const SizedBox(width: 4),
      Text(
        l,
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w500),
      ),
    ],
  );
  static String chr(int code) => String.fromCharCode(code);
}

// ============ ANOMALIES SCREEN ============
class AnomaliesScreen extends StatefulWidget {
  final Map<String, String> headers;
  final String role;
  final String? department;
  const AnomaliesScreen({
    super.key,
    required this.headers,
    required this.role,
    required this.department,
  });
  @override
  State<AnomaliesScreen> createState() => _AnomaliesScreenState();
}

class _AnomaliesScreenState extends State<AnomaliesScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String _search = '';
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await http.get(
        Uri.parse('$kBaseUrl/api/anomalies/list'),
        headers: widget.headers,
      );
      if (r.statusCode == 200 && mounted) {
        setState(() {
          _data = json.decode(r.body);
          _loading = false;
        });
      } else if (mounted) {
        setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final records = (_data?['records'] as List? ?? []).where((r) {
      if (_search.isEmpty) return true;
      final s = _search.toLowerCase();
      return (r['Department'] ?? '').toString().toLowerCase().contains(s) ||
          (r['State'] ?? '').toString().toLowerCase().contains(s) ||
          (r['anomaly_tag'] ?? '').toString().toLowerCase().contains(s);
    }).toList();
    return Scaffold(
      backgroundColor: C.bg,
      appBar: AppBar(
        title: const Text('Anomalies'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: C.border),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: C.orange))
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _statBox(
                              'Total',
                              '${_data?["total_anomalies"] ?? 0}',
                              '+12%',
                              C.orange,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _statBox(
                              'High Risk',
                              '${_data?["high_risk"] ?? 0}',
                              'critical',
                              C.danger,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: _statBox(
                              'Medium',
                              '${_data?["medium_risk"] ?? 0}',
                              'cases',
                              C.amber,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _statBox(
                              'Low',
                              '${_data?["low_risk"] ?? 0}',
                              'under watch',
                              C.success,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Container(
                        decoration: BoxDecoration(
                          color: C.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: C.border),
                        ),
                        child: TextField(
                          onChanged: (v) => setState(() => _search = v),
                          style: const TextStyle(fontSize: 14, color: C.dark),
                          decoration: const InputDecoration(
                            hintText: 'Search department, state or tag...',
                            hintStyle: TextStyle(color: C.muted, fontSize: 13),
                            prefixIcon: Icon(
                              Icons.search,
                              color: C.muted,
                              size: 20,
                            ),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: records.isEmpty
                      ? Center(
                          child: Text(
                            _data == null
                                ? 'Failed to load'
                                : 'No records found',
                            style: const TextStyle(
                              color: C.muted,
                              fontSize: 14,
                            ),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: records.length,
                          itemBuilder: (_, i) =>
                              _AnomalyCard(record: records[i]),
                        ),
                ),
              ],
            ),
    );
  }

  Widget _statBox(String label, String value, String sub, Color color) {
    return wCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: C.muted)),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(sub, style: TextStyle(fontSize: 12, color: color)),
        ],
      ),
    );
  }
}

class _AnomalyCard extends StatelessWidget {
  final dynamic record;
  const _AnomalyCard({required this.record});
  @override
  Widget build(BuildContext context) {
    final risk = record['risk_level'] ?? 'LOW';
    final Color riskColor = risk == 'HIGH'
        ? C.danger
        : risk == 'MEDIUM'
        ? C.amber
        : C.success;
    final Color riskBg = risk == 'HIGH'
        ? C.dangerLight
        : risk == 'MEDIUM'
        ? C.amberLight
        : C.successLight;
    final tag = record['anomaly_tag'] ?? 'Anomaly';
    final fmt = NumberFormat.compact(locale: 'en_IN');
    final alloc = (record['allocated'] as num? ?? 0).toDouble();
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => AnomalyDetailScreen(record: record),
          ),
        ),
        child: wCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          record['Department'] ?? 'Unknown',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: C.dark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${record["State"] ?? ""} • ${record["District"] ?? ""}',
                          style: const TextStyle(fontSize: 12, color: C.muted),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: riskBg,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '$risk RISK',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: riskColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _rv(
                    'Amount',
                    '${chr(8377)}${fmt.format(alloc)} Cr',
                    C.orange,
                  ),
                  const SizedBox(width: 20),
                  _rv(
                    'Util.',
                    '${(record["utilization"] as num? ?? 0).toStringAsFixed(1)}%',
                    riskColor,
                  ),
                  const SizedBox(width: 20),
                  _rv(
                    'Delay',
                    '${(record["delay_days"] as num? ?? 0).toInt()}d',
                    C.muted,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                children: [
                  _chip(tag, C.orange),
                  if ((record['delay_days'] as num? ?? 0) > 90)
                    _chip('Delayed', C.danger),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _rv(String l, String v, Color c) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(l, style: const TextStyle(fontSize: 11, color: C.muted)),
      Text(
        v,
        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: c),
      ),
    ],
  );
  Widget _chip(String l, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      border: Border.all(color: c.withValues(alpha: 0.5)),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(
      l,
      style: TextStyle(fontSize: 10, color: c, fontWeight: FontWeight.w600),
    ),
  );
  static String chr(int code) => String.fromCharCode(code);
}

// ============ ANOMALY DETAIL ============
class AnomalyDetailScreen extends StatelessWidget {
  final dynamic record;
  const AnomalyDetailScreen({super.key, required this.record});
  static String chr(int code) => String.fromCharCode(code);
  @override
  Widget build(BuildContext context) {
    final risk = record['risk_level'] ?? 'LOW';
    final Color riskColor = risk == 'HIGH'
        ? C.danger
        : risk == 'MEDIUM'
        ? C.amber
        : C.success;
    final fmt = NumberFormat.compact(locale: 'en_IN');
    final alloc = (record['allocated'] as num? ?? 0).toDouble();
    final spent = (record['spent'] as num? ?? 0).toDouble();
    final util = (record['utilization'] as num? ?? 0).toDouble();
    return Scaffold(
      backgroundColor: C.bg,
      appBar: AppBar(
        title: const Text('Anomaly Detail'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: C.border),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            wCard(
              color: riskColor.withValues(alpha: 0.05),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: riskColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '$risk RISK',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: riskColor,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '${chr(8377)}${fmt.format(alloc)} Crore',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: riskColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    record['Department'] ?? 'Unknown',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: C.dark,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Ref: ${record["Project_ID"] ?? "N/A"}',
                    style: const TextStyle(fontSize: 12, color: C.muted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Details
            wCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Anomaly Details',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: C.dark,
                    ),
                  ),
                  const Divider(height: 20),
                  _dr('State', record['State'] ?? 'N/A'),
                  _dr('District', record['District'] ?? 'N/A'),
                  _dr('Allocated', '${chr(8377)}${fmt.format(alloc)} Cr'),
                  _dr('Spent', '${chr(8377)}${fmt.format(spent)} Cr'),
                  _dr(
                    'Utilization',
                    '${util.toStringAsFixed(1)}%',
                    vc: riskColor,
                  ),
                  _dr(
                    'Delay Days',
                    '${(record["delay_days"] as num? ?? 0).toInt()} days',
                  ),
                  _dr('Tag', record['anomaly_tag'] ?? 'Anomaly', vc: C.orange),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Audit trail
            wCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Audit Trail',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: C.dark,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _audit(
                    'System Detection',
                    'Anomaly flagged by ML model',
                    '2 hours ago',
                    C.danger,
                  ),
                  _audit(
                    'Risk Assessment',
                    'Classified as $risk risk',
                    '1 hour ago',
                    riskColor,
                  ),
                  _audit(
                    'Pending Review',
                    'Awaiting officer action',
                    'Now',
                    C.muted,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Actions
            const Text(
              'Take Action',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: C.dark,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () => _act(context, 'Flag as Valid'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: C.orange,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Flag as Valid',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton(
                onPressed: () => _act(context, 'Request Investigation'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: C.orange,
                  side: const BorderSide(color: C.orange),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Request Investigation',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton(
                onPressed: () => _act(context, 'Freeze Account'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: C.danger,
                  side: const BorderSide(color: C.danger),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Freeze Account',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _dr(String k, String v, {Color? vc}) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(
      children: [
        SizedBox(
          width: 110,
          child: Text(k, style: const TextStyle(fontSize: 13, color: C.muted)),
        ),
        Expanded(
          child: Text(
            v,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: vc ?? C.dark,
            ),
          ),
        ),
      ],
    ),
  );
  Widget _audit(String title, String desc, String time, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                border: Border.all(
                  color: color.withValues(alpha: 0.3),
                  width: 3,
                ),
              ),
            ),
            Container(width: 2, height: 40, color: C.border),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: C.dark,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: const TextStyle(fontSize: 12, color: C.muted),
                ),
                const SizedBox(height: 4),
                Text(time, style: TextStyle(fontSize: 12, color: color)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _act(BuildContext ctx, String action) {
    showDialog(
      context: ctx,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          action,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: C.dark,
          ),
        ),
        content: Text(
          'Confirm "$action" for this anomaly?',
          style: const TextStyle(fontSize: 14, color: C.dark),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: C.muted)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(ctx).showSnackBar(
                SnackBar(
                  content: Text('$action submitted'),
                  backgroundColor: C.orange,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: C.orange,
              foregroundColor: Colors.white,
              elevation: 0,
            ),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }
}

// ============ ALERTS SCREEN ============
class AlertsScreen extends StatefulWidget {
  final String token;
  const AlertsScreen({super.key, required this.token});
  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  final List<Map<String, dynamic>> _alerts = [];
  final bool _connected = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _alerts.addAll([
      {
        'severity': 'high',
        'title': 'Critical Underspend: Varanasi',
        'message':
            'Health Dept in Varanasi, UP — allocated 42.1Cr but spent only 8.3Cr',
        'time': '2 min ago',
      },
      {
        'severity': 'medium',
        'title': 'Unusual Spike: Pune',
        'message': 'Education Dept in Pune, MH — 185% utilization detected',
        'time': '8 min ago',
      },
      {
        'severity': 'low',
        'title': 'Fund Delay: Jaipur',
        'message':
            'Agriculture Dept in Jaipur, RJ — 112 days delay in fund release',
        'time': '15 min ago',
      },
      {
        'severity': 'high',
        'title': 'Zero Spending: Patna',
        'message':
            'Infrastructure in Patna, BR — 0% utilization, funds stagnant',
        'time': '32 min ago',
      },
      {
        'severity': 'medium',
        'title': 'Duplicate Payment Flag',
        'message': 'Finance Dept in Chennai, TN — possible duplicate of 5.2Cr',
        'time': '1 hr ago',
      },
    ]);
    _timer = Timer.periodic(const Duration(seconds: 45), (_) {
      if (!mounted) return;
      setState(() {
        _alerts.insert(0, {
          'severity': 'high',
          'title': 'Live: New Budget Alert',
          'message':
              'Anomaly detected in ${["Mumbai", "Delhi", "Kolkata", "Hyderabad"][DateTime.now().second % 4]}',
          'time': 'Just now',
        });
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.bg,
      appBar: AppBar(
        title: const Text('Live Alerts'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: C.border),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _connected ? C.success : C.danger,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  _connected ? 'Live' : 'Offline',
                  style: TextStyle(
                    fontSize: 12,
                    color: _connected ? C.success : C.danger,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: _alerts.isEmpty
          ? const Center(
              child: Icon(Icons.notifications_none, size: 64, color: C.muted),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _alerts.length,
              itemBuilder: (_, i) => _AlertCard(alert: _alerts[i]),
            ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  final Map<String, dynamic> alert;
  const _AlertCard({required this.alert});
  @override
  Widget build(BuildContext context) {
    final sev = alert['severity'] as String? ?? 'low';
    final Color color = sev == 'high'
        ? C.danger
        : sev == 'medium'
        ? C.amber
        : C.success;
    final Color bgColor = sev == 'high'
        ? C.dangerLight
        : sev == 'medium'
        ? C.amberLight
        : C.successLight;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: wCard(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                sev == 'high'
                    ? Icons.warning_rounded
                    : sev == 'medium'
                    ? Icons.info_rounded
                    : Icons.check_circle,
                color: color,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    alert['title'] ?? '',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: C.dark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    alert['message'] ?? '',
                    style: const TextStyle(
                      fontSize: 12,
                      color: C.muted,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    alert['time'] ?? '',
                    style: TextStyle(
                      fontSize: 12,
                      color: color,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============ PROFILE SCREEN ============
class ProfileScreen extends StatefulWidget {
  final String fullName, username, role;
  final String? department;
  final VoidCallback onLogout;
  const ProfileScreen({
    super.key,
    required this.fullName,
    required this.username,
    required this.role,
    required this.department,
    required this.onLogout,
  });
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _health;
  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    try {
      final r = await http
          .get(Uri.parse('$kBaseUrl/api/health'))
          .timeout(const Duration(seconds: 5));
      if (mounted && r.statusCode == 200) {
        setState(() => _health = json.decode(r.body));
      }
    } catch (_) {}
  }

  String get _roleLabel => widget.role == 'admin'
      ? 'Administrator'
      : widget.role == 'department'
      ? 'Department Officer'
      : 'Citizen / Public';
  Color get _roleColor => widget.role == 'admin'
      ? C.indigo
      : widget.role == 'department'
      ? C.success
      : C.blue;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.bg,
      appBar: AppBar(
        title: const Text('Profile'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: C.border),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Avatar
            wCard(
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: const Color(0xFFFFF0EB),
                    child: Text(
                      widget.fullName.isNotEmpty
                          ? widget.fullName[0].toUpperCase()
                          : 'U',
                      style: const TextStyle(
                        color: C.orange,
                        fontWeight: FontWeight.w700,
                        fontSize: 26,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.fullName.isNotEmpty
                              ? widget.fullName
                              : widget.username,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: C.dark,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '@${widget.username}',
                          style: const TextStyle(fontSize: 12, color: C.muted),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: _roleColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _roleLabel,
                            style: TextStyle(
                              fontSize: 11,
                              color: _roleColor,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Info
            wCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Account Info',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: C.dark,
                    ),
                  ),
                  const Divider(height: 20),
                  _ir(Icons.person_outline, 'Username', widget.username),
                  _ir(Icons.badge_outlined, 'Role', _roleLabel, c: _roleColor),
                  if (widget.department != null)
                    _ir(
                      Icons.business_outlined,
                      'Department',
                      widget.department!,
                    ),
                  _ir(
                    Icons.shield_outlined,
                    'Access',
                    widget.role == 'admin'
                        ? 'Full Access'
                        : widget.role == 'department'
                        ? 'Dept Restricted'
                        : 'Read Only',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Backend status
            wCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Backend Status',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: C.dark,
                    ),
                  ),
                  const Divider(height: 20),
                  Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: _health != null ? C.success : C.muted,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _health != null ? 'Connected' : 'Checking...',
                        style: TextStyle(
                          color: _health != null ? C.success : C.muted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  if (_health != null) ...[
                    const SizedBox(height: 10),
                    _ir(
                      Icons.storage_outlined,
                      'Records',
                      '${_health!["records"] ?? 0}',
                    ),
                    _ir(
                      Icons.dns_outlined,
                      'Database',
                      '${_health!["database"] ?? "Unknown"}',
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Quick links
            wCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Quick Links',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: C.dark,
                    ),
                  ),
                  const Divider(height: 20),
                  _lnk(
                    context,
                    Icons.map_rounded,
                    'Regional View',
                    'Browse all states',
                    () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const RegionalMapScreen(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Logout
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                onPressed: widget.onLogout,
                icon: const Icon(Icons.logout, color: C.danger, size: 20),
                label: const Text(
                  'Sign Out',
                  style: TextStyle(
                    color: C.danger,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: C.danger),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Hisab Kitab v1.0 • Hackathon 2025',
              style: TextStyle(fontSize: 11, color: C.muted),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _ir(IconData icon, String label, String value, {Color? c}) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Row(
      children: [
        Icon(icon, size: 18, color: C.muted),
        const SizedBox(width: 10),
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: const TextStyle(fontSize: 13, color: C.muted),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: c ?? C.dark,
            ),
          ),
        ),
      ],
    ),
  );
  Widget _lnk(
    BuildContext ctx,
    IconData icon,
    String label,
    String sub,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0EB),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: C.orange, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: C.dark,
                    ),
                  ),
                  Text(
                    sub,
                    style: const TextStyle(fontSize: 12, color: C.muted),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: C.muted, size: 18),
          ],
        ),
      ),
    );
  }
}
