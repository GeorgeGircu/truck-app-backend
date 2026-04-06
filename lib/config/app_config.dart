/// Origine API pentru aplicație.
///
/// **Implicit (fără define):** `https://truck-app-backend.onrender.com`
///
/// **Alt URL (staging, etc.):**
/// `--dart-define=API_BASE_ORIGIN=https://exemplu.com`
///
/// **Backend doar local (fără localhost hardcodat în sursă):**
/// - Android emulator → PC: `--dart-define=API_BASE_ORIGIN=http://10.0.2.2:5000`
/// - iOS simulator / desktop: `--dart-define=API_BASE_ORIGIN=http://127.0.0.1:5000`
class AppConfig {
  AppConfig._();

  static const String _dartDefineOrigin = String.fromEnvironment(
    'API_BASE_ORIGIN',
  );

  /// API live (același host folosit și de build-urile fără `API_BASE_ORIGIN`).
  static const String productionApiOrigin =
      'https://truck-app-backend.onrender.com';

  static String? _normalizeOrigin(String raw) {
    final t = raw.trim();
    if (t.isEmpty) return null;
    return t.endsWith('/') ? t.substring(0, t.length - 1) : t;
  }

  /// Schemă + host (+ port), fără path `/api`.
  static String get apiBaseOrigin {
    final fromDefine = _normalizeOrigin(_dartDefineOrigin);
    if (fromDefine != null) return fromDefine;

    return productionApiOrigin;
  }

  static String get apiRoot => '$apiBaseOrigin/api';

  static String get authApiRoot => '$apiBaseOrigin/api/auth';
}
