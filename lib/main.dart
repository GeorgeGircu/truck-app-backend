import 'package:flutter/material.dart';

import 'config/app_config.dart';
import 'services/auth_service.dart';
import 'package:transport_app/forgot_password_page.dart';
import 'reset_password_page.dart';
import 'pages/map_download_page.dart';

void main() {
  runApp(const IronPiloxApp());
}

/// Mesaje auth: la [SERVER_ERROR] arată și URL-ul API + eroarea tehnică (rețea, timeout, 500).
void showAuthErrorSnackBar(
  BuildContext context,
  String Function(String key) tr,
  Map<String, dynamic> result,
) {
  final code = (result['code'] ?? 'SERVER_ERROR').toString();
  final detail = result['message']?.toString();

  if (code == 'SERVER_ERROR') {
    final b = StringBuffer(tr('SERVER_ERROR'));
    b.writeln();
    b.writeln('API: ${AppConfig.apiBaseOrigin}');
    if (detail != null && detail.isNotEmpty) {
      b.writeln();
      b.write(detail.length > 500 ? '${detail.substring(0, 500)}…' : detail);
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: SingleChildScrollView(
          child: SelectableText(b.toString()),
        ),
        duration: const Duration(seconds: 16),
      ),
    );
    return;
  }

  final translated = tr(code);
  final text = translated == code ? tr('SERVER_ERROR') : translated;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(text)),
  );
}

class IronPiloxApp extends StatelessWidget {
  const IronPiloxApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IRONPILOX',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFF1A1A1A),
        useMaterial3: true,
      ),
      home: const AppEntryPoint(),
    );
  }
}

class AppEntryPoint extends StatefulWidget {
  const AppEntryPoint({super.key});

  @override
  State<AppEntryPoint> createState() => _AppEntryPointState();
}

class _AppEntryPointState extends State<AppEntryPoint> {
  final AuthService authService = AuthService();

  bool isCheckingLogin = true;
  bool isLoggedIn = false;
  String? resetToken;

  @override
  void initState() {
    super.initState();
    _checkAppEntry();
  }

  Future<void> _checkAppEntry() async {
    final uri = Uri.base;
    final fragment = uri.fragment;

    if (fragment.startsWith('/reset-password/')) {
      final token = fragment.replaceFirst('/reset-password/', '');

      if (!mounted) return;

      setState(() {
        resetToken = token;
        isCheckingLogin = false;
      });
      return;
    }

    final logged = await authService.isLoggedIn();

    if (!mounted) return;

    setState(() {
      isLoggedIn = logged;
      isCheckingLogin = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (isCheckingLogin) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (resetToken != null) {
      return ResetPasswordPage(token: resetToken!);
    }

    if (isLoggedIn) {
      return SubscriptionScreen(
        selectedLanguage: 'English',
        translations: appTranslations,
      );
    }

    return const AuthScreen();
  }
}

final Map<String, Map<String, String>> appTranslations = {
  'English': {
    'email': 'Email',
    'password': 'Password',
    'selectCountry': 'Select country',
    'searchCountry': 'Search country',
    'selectLanguage': 'Select language',
    'createAccount': 'Create account',
    'alreadyAccount': 'Already have an account? Log in',
    'login': 'Login',
    'dontHaveAccount': 'Don’t have an account? Sign up now',
    'chooseSubscription': 'Choose Subscription',
    'pickPlan': 'Pick your plan',
    'chooseHow': 'Choose how you want to use IRONPILOX',
    'basic': 'Basic',
    'basicSubtitle': 'Basic with ads',
    'premium': 'Premium',
    'premiumSubtitle': 'No ads',
    'free': 'Free',
    'premiumPrice': '£5 / month',
    'routeSearch': 'Route search',
    'truckInput': 'Truck dimensions input',
    'navAfterAd': 'Navigation starts after ad',
    'navNoAds': 'Navigation without ads',
    'chooseBasic': 'Choose Basic',
    'choosePremium': 'Choose Premium',
    'enterVerificationCode': 'Enter verification code',
    'verificationSubtitle': 'We sent a 6-digit code to',
    'confirm': 'Confirm',
    'back': 'Back',
    'resendCode': 'Resend code',
    'invalidCode': 'Invalid verification code.',
    'enterAllDigits': 'Please enter all 6 digits.',
    'codeResent': 'A new verification code has been sent to your email.',
    'invalidEmail': 'Please enter a valid email address.',
    'passwordTooShort': 'Password must be at least 6 characters.',
    'selectCountryError': 'Please select your country.',
    'loginFailed': 'Login failed.',
    'loginSuccess': 'Login successful.',
    'registerFailed': 'Registration failed.',
    'registerSuccess': 'Account created successfully.',
    'logout': 'Logout',
    'forgotPassword': 'Forgot password?',
    'serverError': 'A server error occurred. Please try again.',
    'emailVerified': 'Your email has been verified successfully.',
    'MISSING_FIELDS': 'Email and password are required.',
    'USER_ALREADY_EXISTS': 'An account with this email already exists.',
    'INVALID_CREDENTIALS': 'Invalid email or password.',
    'USER_NOT_FOUND': 'User not found.',
    'EMAIL_REQUIRED': 'Email is required.',
    'PASSWORD_REQUIRED': 'Password is required.',
    'INVALID_OR_EXPIRED_TOKEN': 'The reset link is invalid or has expired.',
    'INVALID_OR_EXPIRED_CODE': 'The verification code is invalid or has expired.',
    'RESET_EMAIL_SENT': 'A password reset email has been sent.',
    'PASSWORD_RESET_SUCCESS': 'Your password has been reset successfully.',
    'EMAIL_VERIFIED': 'Your email has been verified successfully.',
    'CODE_RESENT': 'A new verification code has been sent to your email.',
    'REGISTER_SUCCESS': 'Account created successfully.',
    'LOGIN_SUCCESS': 'Login successful.',
    'SERVER_ERROR': 'A server error occurred. Please try again.',
  },
  'Română': {
    'email': 'Email',
    'password': 'Parolă',
    'selectCountry': 'Selectează țara',
    'searchCountry': 'Caută țara',
    'selectLanguage': 'Selectează limba',
    'createAccount': 'Creează cont',
    'alreadyAccount': 'Ai deja cont? Conectează-te',
    'login': 'Conectare',
    'dontHaveAccount': 'Nu ai cont? Creează unul acum',
    'chooseSubscription': 'Alege abonamentul',
    'pickPlan': 'Alege planul',
    'chooseHow': 'Alege cum vrei să folosești IRONPILOX',
    'basic': 'Basic',
    'basicSubtitle': 'Basic cu reclame',
    'premium': 'Premium',
    'premiumSubtitle': 'Fără reclame',
    'free': 'Gratuit',
    'premiumPrice': '£5 / lună',
    'routeSearch': 'Căutare rută',
    'truckInput': 'Introducere dimensiuni camion',
    'navAfterAd': 'Navigarea pornește după reclamă',
    'navNoAds': 'Navigare fără reclame',
    'chooseBasic': 'Alege Basic',
    'choosePremium': 'Alege Premium',
    'enterVerificationCode': 'Introdu codul de verificare',
    'verificationSubtitle': 'Am trimis un cod din 6 cifre la',
    'confirm': 'Confirmă',
    'back': 'Înapoi',
    'resendCode': 'Retrimite codul',
    'invalidCode': 'Cod de verificare invalid.',
    'enterAllDigits': 'Te rog introdu toate cele 6 cifre.',
    'codeResent': 'Un nou cod de verificare a fost trimis pe email.',
    'invalidEmail': 'Te rog introdu o adresă de email validă.',
    'passwordTooShort': 'Parola trebuie să aibă cel puțin 6 caractere.',
    'selectCountryError': 'Te rog selectează țara.',
    'loginFailed': 'Autentificare eșuată.',
    'loginSuccess': 'Autentificare reușită.',
    'registerFailed': 'Înregistrare eșuată.',
    'registerSuccess': 'Cont creat cu succes.',
    'logout': 'Deconectare',
    'forgotPassword': 'Ai uitat parola?',
    'serverError': 'A apărut o eroare de server. Te rugăm să încerci din nou.',
    'emailVerified': 'Emailul tău a fost verificat cu succes.',
    'MISSING_FIELDS': 'Emailul și parola sunt obligatorii.',
    'USER_ALREADY_EXISTS': 'Există deja un cont cu acest email.',
    'INVALID_CREDENTIALS': 'Email sau parolă incorectă.',
    'USER_NOT_FOUND': 'Utilizatorul nu există.',
    'EMAIL_REQUIRED': 'Emailul este obligatoriu.',
    'PASSWORD_REQUIRED': 'Parola este obligatorie.',
    'INVALID_OR_EXPIRED_TOKEN': 'Linkul de resetare este invalid sau expirat.',
    'INVALID_OR_EXPIRED_CODE': 'Codul de verificare este invalid sau expirat.',
    'RESET_EMAIL_SENT': 'Emailul pentru resetarea parolei a fost trimis.',
    'PASSWORD_RESET_SUCCESS': 'Parola a fost resetată cu succes.',
    'EMAIL_VERIFIED': 'Emailul tău a fost verificat cu succes.',
    'CODE_RESENT': 'Un nou cod de verificare a fost trimis pe email.',
    'REGISTER_SUCCESS': 'Cont creat cu succes.',
    'LOGIN_SUCCESS': 'Autentificare reușită.',
    'SERVER_ERROR': 'A apărut o eroare de server. Te rugăm să încerci din nou.',
  },
  'Deutsch': {
    'email': 'E-Mail',
    'password': 'Passwort',
    'selectCountry': 'Land auswählen',
    'searchCountry': 'Land suchen',
    'selectLanguage': 'Sprache auswählen',
    'createAccount': 'Konto erstellen',
    'alreadyAccount': 'Hast du bereits ein Konto? Anmelden',
    'login': 'Anmelden',
    'dontHaveAccount': 'Du hast noch kein Konto? Jetzt registrieren',
    'chooseSubscription': 'Abonnement auswählen',
    'pickPlan': 'Wähle deinen Tarif',
    'chooseHow': 'Wähle, wie du IRONPILOX nutzen möchtest',
    'basic': 'Basic',
    'basicSubtitle': 'Basic mit Werbung',
    'premium': 'Premium',
    'premiumSubtitle': 'Ohne Werbung',
    'free': 'Kostenlos',
    'premiumPrice': '£5 / Monat',
    'routeSearch': 'Routensuche',
    'truckInput': 'Eingabe der LKW-Abmessungen',
    'navAfterAd': 'Navigation startet nach der Werbung',
    'navNoAds': 'Navigation ohne Werbung',
    'chooseBasic': 'Basic wählen',
    'choosePremium': 'Premium wählen',
    'enterVerificationCode': 'Bestätigungscode eingeben',
    'verificationSubtitle': 'Wir haben einen 6-stelligen Code gesendet an',
    'confirm': 'Bestätigen',
    'back': 'Zurück',
    'resendCode': 'Code erneut senden',
    'invalidCode': 'Ungültiger Bestätigungscode.',
    'enterAllDigits': 'Bitte gib alle 6 Ziffern ein.',
    'codeResent': 'Ein neuer Bestätigungscode wurde an deine E-Mail gesendet.',
    'invalidEmail': 'Bitte gib eine gültige E-Mail-Adresse ein.',
    'passwordTooShort': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
    'selectCountryError': 'Bitte wähle dein Land aus.',
    'loginFailed': 'Anmeldung fehlgeschlagen.',
    'loginSuccess': 'Anmeldung erfolgreich.',
    'registerFailed': 'Registrierung fehlgeschlagen.',
    'registerSuccess': 'Konto erfolgreich erstellt.',
    'logout': 'Abmelden',
    'forgotPassword': 'Passwort vergessen?',
    'serverError': 'Ein Serverfehler ist aufgetreten. Bitte versuche es erneut.',
    'emailVerified': 'Deine E-Mail wurde erfolgreich bestätigt.',
    'MISSING_FIELDS': 'E-Mail und Passwort sind erforderlich.',
    'USER_ALREADY_EXISTS': 'Für diese E-Mail existiert bereits ein Konto.',
    'INVALID_CREDENTIALS': 'Ungültige E-Mail oder Passwort.',
    'USER_NOT_FOUND': 'Benutzer nicht gefunden.',
    'EMAIL_REQUIRED': 'E-Mail ist erforderlich.',
    'PASSWORD_REQUIRED': 'Passwort ist erforderlich.',
    'INVALID_OR_EXPIRED_TOKEN': 'Der Reset-Link ist ungültig oder abgelaufen.',
    'INVALID_OR_EXPIRED_CODE': 'Der Bestätigungscode ist ungültig oder abgelaufen.',
    'RESET_EMAIL_SENT': 'Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet.',
    'PASSWORD_RESET_SUCCESS': 'Dein Passwort wurde erfolgreich zurückgesetzt.',
    'EMAIL_VERIFIED': 'Deine E-Mail wurde erfolgreich bestätigt.',
    'CODE_RESENT': 'Ein neuer Bestätigungscode wurde an deine E-Mail gesendet.',
    'REGISTER_SUCCESS': 'Konto erfolgreich erstellt.',
    'LOGIN_SUCCESS': 'Anmeldung erfolgreich.',
    'SERVER_ERROR': 'Ein Serverfehler ist aufgetreten. Bitte versuche es erneut.',
  },
  'Français': {
    'email': 'E-mail',
    'password': 'Mot de passe',
    'selectCountry': 'Sélectionnez le pays',
    'searchCountry': 'Rechercher un pays',
    'selectLanguage': 'Sélectionnez la langue',
    'createAccount': 'Créer un compte',
    'alreadyAccount': 'Vous avez déjà un compte ? Connectez-vous',
    'login': 'Connexion',
    'dontHaveAccount': 'Vous n’avez pas de compte ? Inscrivez-vous maintenant',
    'chooseSubscription': 'Choisir l’abonnement',
    'pickPlan': 'Choisissez votre formule',
    'chooseHow': 'Choisissez comment utiliser IRONPILOX',
    'basic': 'Basic',
    'basicSubtitle': 'Basic avec publicités',
    'premium': 'Premium',
    'premiumSubtitle': 'Sans publicités',
    'free': 'Gratuit',
    'premiumPrice': '£5 / mois',
    'routeSearch': 'Recherche d’itinéraire',
    'truckInput': 'Saisie des dimensions du camion',
    'navAfterAd': 'La navigation démarre après la publicité',
    'navNoAds': 'Navigation sans publicités',
    'chooseBasic': 'Choisir Basic',
    'choosePremium': 'Choisir Premium',
    'enterVerificationCode': 'Entrez le code de vérification',
    'verificationSubtitle': 'Nous avons envoyé un code à 6 chiffres à',
    'confirm': 'Confirmer',
    'back': 'Retour',
    'resendCode': 'Renvoyer le code',
    'invalidCode': 'Code de vérification invalide.',
    'enterAllDigits': 'Veuillez saisir les 6 chiffres.',
    'codeResent': 'Un nouveau code de vérification a été envoyé à votre e-mail.',
    'invalidEmail': 'Veuillez saisir une adresse e-mail valide.',
    'passwordTooShort': 'Le mot de passe doit contenir au moins 6 caractères.',
    'selectCountryError': 'Veuillez sélectionner votre pays.',
    'loginFailed': 'Échec de la connexion.',
    'loginSuccess': 'Connexion réussie.',
    'registerFailed': 'Échec de l’inscription.',
    'registerSuccess': 'Compte créé avec succès.',
    'logout': 'Déconnexion',
    'forgotPassword': 'Mot de passe oublié ?',
    'serverError': 'Une erreur serveur s’est produite. Veuillez réessayer.',
    'emailVerified': 'Votre e-mail a été vérifié avec succès.',
    'MISSING_FIELDS': 'L’e-mail et le mot de passe sont obligatoires.',
    'USER_ALREADY_EXISTS': 'Un compte avec cet e-mail existe déjà.',
    'INVALID_CREDENTIALS': 'E-mail ou mot de passe invalide.',
    'USER_NOT_FOUND': 'Utilisateur introuvable.',
    'EMAIL_REQUIRED': 'L’e-mail est obligatoire.',
    'PASSWORD_REQUIRED': 'Le mot de passe est obligatoire.',
    'INVALID_OR_EXPIRED_TOKEN': 'Le lien de réinitialisation est invalide ou expiré.',
    'INVALID_OR_EXPIRED_CODE': 'Le code de vérification est invalide ou expiré.',
    'RESET_EMAIL_SENT': 'Un e-mail de réinitialisation du mot de passe a été envoyé.',
    'PASSWORD_RESET_SUCCESS': 'Votre mot de passe a été réinitialisé avec succès.',
    'EMAIL_VERIFIED': 'Votre e-mail a été vérifié avec succès.',
    'CODE_RESENT': 'Un nouveau code de vérification a été envoyé à votre e-mail.',
    'REGISTER_SUCCESS': 'Compte créé avec succès.',
    'LOGIN_SUCCESS': 'Connexion réussie.',
    'SERVER_ERROR': 'Une erreur serveur s’est produite. Veuillez réessayer.',
  },
  'Español': {
    'email': 'Correo electrónico',
    'password': 'Contraseña',
    'selectCountry': 'Seleccionar país',
    'searchCountry': 'Buscar país',
    'selectLanguage': 'Seleccionar idioma',
    'createAccount': 'Crear cuenta',
    'alreadyAccount': '¿Ya tienes una cuenta? Inicia sesión',
    'login': 'Iniciar sesión',
    'dontHaveAccount': '¿No tienes una cuenta? Regístrate ahora',
    'chooseSubscription': 'Elegir suscripción',
    'pickPlan': 'Elige tu plan',
    'chooseHow': 'Elige cómo quieres usar IRONPILOX',
    'basic': 'Basic',
    'basicSubtitle': 'Basic con anuncios',
    'premium': 'Premium',
    'premiumSubtitle': 'Sin anuncios',
    'free': 'Gratis',
    'premiumPrice': '£5 / mes',
    'routeSearch': 'Búsqueda de ruta',
    'truckInput': 'Entrada de dimensiones del camión',
    'navAfterAd': 'La navegación comienza después del anuncio',
    'navNoAds': 'Navegación sin anuncios',
    'chooseBasic': 'Elegir Basic',
    'choosePremium': 'Elegir Premium',
    'enterVerificationCode': 'Introduce el código de verificación',
    'verificationSubtitle': 'Hemos enviado un código de 6 dígitos a',
    'confirm': 'Confirmar',
    'back': 'Atrás',
    'resendCode': 'Reenviar código',
    'invalidCode': 'Código de verificación no válido.',
    'enterAllDigits': 'Por favor, introduce los 6 dígitos.',
    'codeResent': 'Se ha enviado un nuevo código de verificación a tu correo.',
    'invalidEmail': 'Por favor, introduce una dirección de correo válida.',
    'passwordTooShort': 'La contraseña debe tener al menos 6 caracteres.',
    'selectCountryError': 'Por favor, selecciona tu país.',
    'loginFailed': 'Error al iniciar sesión.',
    'loginSuccess': 'Inicio de sesión correcto.',
    'registerFailed': 'Error al registrarse.',
    'registerSuccess': 'Cuenta creada correctamente.',
    'logout': 'Cerrar sesión',
    'forgotPassword': '¿Olvidaste tu contraseña?',
    'serverError': 'Se ha producido un error del servidor. Inténtalo de nuevo.',
    'emailVerified': 'Tu correo electrónico ha sido verificado correctamente.',
    'MISSING_FIELDS': 'El correo y la contraseña son obligatorios.',
    'USER_ALREADY_EXISTS': 'Ya existe una cuenta con este correo.',
    'INVALID_CREDENTIALS': 'Correo o contraseña no válidos.',
    'USER_NOT_FOUND': 'Usuario no encontrado.',
    'EMAIL_REQUIRED': 'El correo es obligatorio.',
    'PASSWORD_REQUIRED': 'La contraseña es obligatoria.',
    'INVALID_OR_EXPIRED_TOKEN': 'El enlace de restablecimiento no es válido o ha caducado.',
    'INVALID_OR_EXPIRED_CODE': 'El código de verificación no es válido o ha caducado.',
    'RESET_EMAIL_SENT': 'Se ha enviado un correo para restablecer la contraseña.',
    'PASSWORD_RESET_SUCCESS': 'Tu contraseña se ha restablecido correctamente.',
    'EMAIL_VERIFIED': 'Tu correo electrónico ha sido verificado correctamente.',
    'CODE_RESENT': 'Se ha enviado un nuevo código de verificación a tu correo.',
    'REGISTER_SUCCESS': 'Cuenta creada correctamente.',
    'LOGIN_SUCCESS': 'Inicio de sesión correcto.',
    'SERVER_ERROR': 'Se ha producido un error del servidor. Inténtalo de nuevo.',
  },
  'Italiano': {
    'email': 'Email',
    'password': 'Password',
    'selectCountry': 'Seleziona il paese',
    'searchCountry': 'Cerca paese',
    'selectLanguage': 'Seleziona la lingua',
    'createAccount': 'Crea account',
    'alreadyAccount': 'Hai già un account? Accedi',
    'login': 'Accedi',
    'dontHaveAccount': 'Non hai un account? Registrati ora',
    'chooseSubscription': 'Scegli abbonamento',
    'pickPlan': 'Scegli il tuo piano',
    'chooseHow': 'Scegli come vuoi usare IRONPILOX',
    'basic': 'Basic',
    'basicSubtitle': 'Basic con annunci',
    'premium': 'Premium',
    'premiumSubtitle': 'Senza annunci',
    'free': 'Gratis',
    'premiumPrice': '£5 / mese',
    'routeSearch': 'Ricerca percorso',
    'truckInput': 'Inserimento dimensioni camion',
    'navAfterAd': 'La navigazione inizia dopo la pubblicità',
    'navNoAds': 'Navigazione senza annunci',
    'chooseBasic': 'Scegli Basic',
    'choosePremium': 'Scegli Premium',
    'enterVerificationCode': 'Inserisci il codice di verifica',
    'verificationSubtitle': 'Abbiamo inviato un codice di 6 cifre a',
    'confirm': 'Conferma',
    'back': 'Indietro',
    'resendCode': 'Invia di nuovo il codice',
    'invalidCode': 'Codice di verifica non valido.',
    'enterAllDigits': 'Inserisci tutte e 6 le cifre.',
    'codeResent': 'Un nuovo codice di verifica è stato inviato alla tua email.',
    'invalidEmail': 'Inserisci un indirizzo email valido.',
    'passwordTooShort': 'La password deve contenere almeno 6 caratteri.',
    'selectCountryError': 'Seleziona il tuo paese.',
    'loginFailed': 'Accesso non riuscito.',
    'loginSuccess': 'Accesso effettuato con successo.',
    'registerFailed': 'Registrazione non riuscita.',
    'registerSuccess': 'Account creato con successo.',
    'logout': 'Esci',
    'forgotPassword': 'Hai dimenticato la password?',
    'serverError': 'Si è verificato un errore del server. Riprova.',
    'emailVerified': 'La tua email è stata verificata con successo.',
    'MISSING_FIELDS': 'Email e password sono obbligatorie.',
    'USER_ALREADY_EXISTS': 'Esiste già un account con questa email.',
    'INVALID_CREDENTIALS': 'Email o password non valide.',
    'USER_NOT_FOUND': 'Utente non trovato.',
    'EMAIL_REQUIRED': 'L’email è obbligatoria.',
    'PASSWORD_REQUIRED': 'La password è obbligatoria.',
    'INVALID_OR_EXPIRED_TOKEN': 'Il link di reimpostazione non è valido o è scaduto.',
    'INVALID_OR_EXPIRED_CODE': 'Il codice di verifica non è valido o è scaduto.',
    'RESET_EMAIL_SENT': 'È stata inviata un’email per reimpostare la password.',
    'PASSWORD_RESET_SUCCESS': 'La tua password è stata reimpostata con successo.',
    'EMAIL_VERIFIED': 'La tua email è stata verificata con successo.',
    'CODE_RESENT': 'Un nuovo codice di verifica è stato inviato alla tua email.',
    'REGISTER_SUCCESS': 'Account creato con successo.',
    'LOGIN_SUCCESS': 'Accesso effettuato con successo.',
    'SERVER_ERROR': 'Si è verificato un errore del server. Riprova.',
  },
};

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final AuthService authService = AuthService();

  bool obscurePassword = true;
  bool isRegisterLoading = false;

  String selectedLanguage = 'English';
  String selectedCountry = 'United Kingdom';

  final List<String> languages = const [
    'English',
    'Română',
    'Deutsch',
    'Français',
    'Español',
    'Italiano',
  ];

  final List<String> countries = const [
    'Afghanistan',
    'Albania',
    'Algeria',
    'Andorra',
    'Angola',
    'Argentina',
    'Armenia',
    'Australia',
    'Austria',
    'Azerbaijan',
    'Belgium',
    'Bosnia and Herzegovina',
    'Brazil',
    'Bulgaria',
    'Canada',
    'China',
    'Croatia',
    'Cyprus',
    'Czech Republic',
    'Denmark',
    'Egypt',
    'Estonia',
    'Finland',
    'France',
    'Georgia',
    'Germany',
    'Greece',
    'Hungary',
    'Iceland',
    'India',
    'Ireland',
    'Italy',
    'Japan',
    'Latvia',
    'Lithuania',
    'Luxembourg',
    'Malta',
    'Moldova',
    'Montenegro',
    'Netherlands',
    'North Macedonia',
    'Norway',
    'Poland',
    'Portugal',
    'Romania',
    'Serbia',
    'Slovakia',
    'Slovenia',
    'Spain',
    'Sweden',
    'Switzerland',
    'Turkey',
    'Ukraine',
    'United Arab Emirates',
    'United Kingdom',
    'United States',
  ];

  String t(String key) {
    return appTranslations[selectedLanguage]?[key] ??
        appTranslations['English']![key] ??
        key;
  }

  void _showTranslatedMessage(String code, {bool fallbackServerError = true}) {
    final translated = t(code);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          translated == code && fallbackServerError
              ? t('SERVER_ERROR')
              : translated,
        ),
      ),
    );
  }

  String? _validateSignup() {
    final email = emailController.text.trim();
    final password = passwordController.text;
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+$');

    if (!emailRegex.hasMatch(email)) {
      return t('invalidEmail');
    }

    if (password.length < 6) {
      return t('passwordTooShort');
    }

    if (selectedCountry.trim().isEmpty) {
      return t('selectCountryError');
    }

    return null;
  }

  Future<void> _handleRegister() async {
    final validationError = _validateSignup();

    if (validationError != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(validationError)),
      );
      return;
    }

    setState(() {
      isRegisterLoading = true;
    });

    final result = await authService.register(
      emailController.text.trim(),
      passwordController.text,
    );

    if (!mounted) return;

    setState(() {
      isRegisterLoading = false;
    });

    if (result['success'] == true) {
      _showTranslatedMessage('REGISTER_SUCCESS', fallbackServerError: false);

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => VerificationCodeScreen(
            selectedLanguage: selectedLanguage,
            translations: appTranslations,
            email: emailController.text.trim(),
          ),
        ),
      );
    } else {
      showAuthErrorSnackBar(context, t, result);
    }
  }

  Future<void> _showCountryPicker() async {
    final result = await showDialog<String>(
      context: context,
      builder: (context) {
        final TextEditingController searchController = TextEditingController();
        List<String> filteredCountries = List.from(countries);

        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(t('selectCountry')),
              content: SizedBox(
                width: 420,
                height: 420,
                child: Column(
                  children: [
                    TextField(
                      controller: searchController,
                      decoration: InputDecoration(
                        hintText: t('searchCountry'),
                        prefixIcon: const Icon(Icons.search),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onChanged: (value) {
                        setDialogState(() {
                          filteredCountries = countries
                              .where((country) => country
                                  .toLowerCase()
                                  .contains(value.toLowerCase()))
                              .toList();
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: ListView.builder(
                        itemCount: filteredCountries.length,
                        itemBuilder: (context, index) {
                          final country = filteredCountries[index];
                          return ListTile(
                            title: Text(country),
                            onTap: () {
                              Navigator.pop(context, country);
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (result != null) {
      setState(() {
        selectedCountry = result;
      });
    }
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Widget _buildCountryPickerField() {
    return InkWell(
      onTap: _showCountryPicker,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.96),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: [
            const Icon(Icons.public, color: Colors.black54),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                selectedCountry,
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.black87,
                ),
              ),
            ),
            const Icon(Icons.arrow_drop_down, color: Colors.black54),
          ],
        ),
      ),
    );
  }

  Widget _buildPasswordField() {
    return TextField(
      controller: passwordController,
      obscureText: obscurePassword,
      style: const TextStyle(color: Colors.black87),
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white.withOpacity(0.96),
        hintText: t('password'),
        prefixIcon: const Icon(Icons.lock_outline),
        suffixIcon: IconButton(
          icon: Icon(
            obscurePassword ? Icons.visibility_off : Icons.visibility,
          ),
          onPressed: () {
            setState(() {
              obscurePassword = !obscurePassword;
            });
          },
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 18,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    bool obscureText = false,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      style: const TextStyle(color: Colors.black87),
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white.withOpacity(0.96),
        hintText: hintText,
        prefixIcon: Icon(icon),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 18,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset(
              'assets/images/ironpilox_logo.png',
              fit: BoxFit.cover,
            ),
          ),
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.18),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 780),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 240),
                      const SizedBox(height: 30),
                      _buildField(
                        controller: emailController,
                        hintText: t('email'),
                        icon: Icons.email_outlined,
                      ),
                      const SizedBox(height: 16),
                      _buildPasswordField(),
                      const SizedBox(height: 16),
                      _buildCountryPickerField(),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        initialValue: selectedLanguage,
                        isExpanded: true,
                        dropdownColor: Colors.white,
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: Colors.white.withOpacity(0.96),
                          prefixIcon: const Icon(Icons.language),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 18,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(18),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        items: languages.map((lang) {
                          return DropdownMenuItem<String>(
                            value: lang,
                            child: Text(lang),
                          );
                        }).toList(),
                        onChanged: (value) {
                          if (value == null) return;
                          setState(() {
                            selectedLanguage = value;
                          });
                        },
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: isRegisterLoading ? null : _handleRegister,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFB71C1C),
                          foregroundColor: Colors.white,
                          elevation: 8,
                          shadowColor: Colors.black54,
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        child: isRegisterLoading
                            ? const SizedBox(
                                height: 22,
                                width: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                t('createAccount'),
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => LoginScreen(
                                selectedLanguage: selectedLanguage,
                                translations: appTranslations,
                              ),
                            ),
                          );
                        },
                        child: Text(
                          t('alreadyAccount'),
                          style: const TextStyle(
                            color: Colors.black,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  final String selectedLanguage;
  final Map<String, Map<String, String>> translations;

  const LoginScreen({
    super.key,
    required this.selectedLanguage,
    required this.translations,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final AuthService authService = AuthService();

  bool obscurePassword = true;
  bool isLoading = false;

  String t(String key) {
    return widget.translations[widget.selectedLanguage]?[key] ??
        widget.translations['English']![key] ??
        key;
  }

  void _showTranslatedMessage(String code, {bool fallbackServerError = true}) {
    final translated = t(code);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          translated == code && fallbackServerError
              ? t('SERVER_ERROR')
              : translated,
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    final email = emailController.text.trim();
    final password = passwordController.text;
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+$');

    if (!emailRegex.hasMatch(email)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('invalidEmail'))),
      );
      return;
    }

    if (password.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('passwordTooShort'))),
      );
      return;
    }

    setState(() {
      isLoading = true;
    });

    final result = await authService.login(email, password);

    if (!mounted) return;

    setState(() {
      isLoading = false;
    });

    if (result['success'] == true) {
      _showTranslatedMessage('LOGIN_SUCCESS', fallbackServerError: false);

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => SubscriptionScreen(
            selectedLanguage: widget.selectedLanguage,
            translations: widget.translations,
          ),
        ),
      );
    } else {
      showAuthErrorSnackBar(context, t, result);
    }
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Widget _buildField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
  }) {
    return TextField(
      controller: controller,
      style: const TextStyle(color: Colors.black87),
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white.withOpacity(0.96),
        hintText: hintText,
        prefixIcon: Icon(icon),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 18,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  Widget _buildPasswordField() {
    return TextField(
      controller: passwordController,
      obscureText: obscurePassword,
      style: const TextStyle(color: Colors.black87),
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white.withOpacity(0.96),
        hintText: t('password'),
        prefixIcon: const Icon(Icons.lock_outline),
        suffixIcon: IconButton(
          icon: Icon(
            obscurePassword ? Icons.visibility_off : Icons.visibility,
          ),
          onPressed: () {
            setState(() {
              obscurePassword = !obscurePassword;
            });
          },
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 18,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset(
              'assets/images/ironpilox_logo.png',
              fit: BoxFit.cover,
            ),
          ),
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.18),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 780),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 300),
                      _buildField(
                        controller: emailController,
                        hintText: t('email'),
                        icon: Icons.email_outlined,
                      ),
                      const SizedBox(height: 16),
                      _buildPasswordField(),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: isLoading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFB71C1C),
                          foregroundColor: Colors.white,
                          elevation: 8,
                          shadowColor: Colors.black54,
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        child: isLoading
                            ? const SizedBox(
                                height: 22,
                                width: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                t('login'),
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: Center(
                          child: SizedBox(
                            width: 230,
                            child: ElevatedButton(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const ForgotPasswordPage(),
                                  ),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.red.shade800,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(20),
                                ),
                              ),
                              child: Text(
                                t('forgotPassword'),
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextButton(
                        onPressed: () {
                          Navigator.pop(context);
                        },
                        child: Text(
                          t('dontHaveAccount'),
                          style: const TextStyle(
                            color: Colors.black,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class VerificationCodeScreen extends StatefulWidget {
  final String selectedLanguage;
  final Map<String, Map<String, String>> translations;
  final String email;

  const VerificationCodeScreen({
    super.key,
    required this.selectedLanguage,
    required this.translations,
    required this.email,
  });

  @override
  State<VerificationCodeScreen> createState() => _VerificationCodeScreenState();
}

class _VerificationCodeScreenState extends State<VerificationCodeScreen> {
  final List<TextEditingController> codeControllers =
      List.generate(6, (_) => TextEditingController());

  final AuthService authService = AuthService();

  String? errorMessage;
  bool isVerifying = false;
  bool isResending = false;

  String t(String key) {
    return widget.translations[widget.selectedLanguage]?[key] ??
        widget.translations['English']![key] ??
        key;
  }

  @override
  void dispose() {
    for (final controller in codeControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _verifyCode() async {
    final enteredCode =
        codeControllers.map((controller) => controller.text.trim()).join();

    if (enteredCode.length != 6) {
      setState(() {
        errorMessage = t('enterAllDigits');
      });
      return;
    }

    setState(() {
      isVerifying = true;
      errorMessage = null;
    });

    final result = await authService.verifyEmail(widget.email, enteredCode);

    if (!mounted) return;

    setState(() {
      isVerifying = false;
    });

    if (result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('EMAIL_VERIFIED'))),
      );

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (_) => LoginScreen(
            selectedLanguage: widget.selectedLanguage,
            translations: widget.translations,
          ),
        ),
        (route) => false,
      );
    } else {
      setState(() {
        final code = result['code'] ?? 'SERVER_ERROR';
        if (code == 'SERVER_ERROR') {
          final d = result['message']?.toString() ?? '';
          errorMessage =
              '${t('SERVER_ERROR')}\nAPI: ${AppConfig.apiBaseOrigin}${d.isNotEmpty ? '\n$d' : ''}';
        } else {
          errorMessage = t(code) == code ? t('SERVER_ERROR') : t(code);
        }
      });
    }
  }

  Future<void> _resendCode() async {
    setState(() {
      isResending = true;
      errorMessage = null;
    });

    for (final controller in codeControllers) {
      controller.clear();
    }

    final result = await authService.resendVerificationCode(widget.email);

    if (!mounted) return;

    setState(() {
      isResending = false;
    });

    if (result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('CODE_RESENT'))),
      );
    } else {
      setState(() {
        final code = result['code'] ?? 'SERVER_ERROR';
        if (code == 'SERVER_ERROR') {
          final d = result['message']?.toString() ?? '';
          errorMessage =
              '${t('SERVER_ERROR')}\nAPI: ${AppConfig.apiBaseOrigin}${d.isNotEmpty ? '\n$d' : ''}';
        } else {
          errorMessage = t(code) == code ? t('SERVER_ERROR') : t(code);
        }
      });
    }
  }

  Widget _buildCodeBox(int index) {
    return SizedBox(
      width: 52,
      child: TextField(
        controller: codeControllers[index],
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        maxLength: 1,
        style: const TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.bold,
          color: Colors.black87,
        ),
        decoration: InputDecoration(
          counterText: '',
          filled: true,
          fillColor: Colors.white.withOpacity(0.96),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none,
          ),
        ),
        onChanged: (value) {
          if (value.isNotEmpty && index < 5) {
            FocusScope.of(context).nextFocus();
          }
          if (value.isEmpty && index > 0) {
            FocusScope.of(context).previousFocus();
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isBusy = isVerifying || isResending;

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset(
              'assets/images/ironpilox_logo.png',
              fit: BoxFit.cover,
            ),
          ),
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.18),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 780),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 260),
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.92),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Column(
                          children: [
                            const Icon(
                              Icons.verified_user_outlined,
                              size: 54,
                              color: Color(0xFFB71C1C),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              t('enterVerificationCode'),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w900,
                                color: Colors.black87,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              '${t('verificationSubtitle')} ${widget.email}',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 15,
                                color: Colors.black54,
                              ),
                            ),
                            const SizedBox(height: 24),
                            Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              alignment: WrapAlignment.center,
                              children: List.generate(
                                6,
                                (index) => _buildCodeBox(index),
                              ),
                            ),
                            const SizedBox(height: 16),
                            if (errorMessage != null)
                              Text(
                                errorMessage!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Colors.red,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            const SizedBox(height: 24),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: isBusy ? null : _verifyCode,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFB71C1C),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 18),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(18),
                                  ),
                                ),
                                child: isVerifying
                                    ? const SizedBox(
                                        height: 22,
                                        width: 22,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.5,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Text(
                                        t('confirm'),
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextButton(
                              onPressed: isBusy ? null : _resendCode,
                              child: isResending
                                  ? const SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : Text(
                                      t('resendCode'),
                                      style: const TextStyle(
                                        color: Colors.black,
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                            ),
                            TextButton(
                              onPressed: isBusy
                                  ? null
                                  : () {
                                      Navigator.pop(context);
                                    },
                              child: Text(
                                t('back'),
                                style: const TextStyle(
                                  color: Colors.black,
                                  fontSize: 15,
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
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SubscriptionScreen extends StatelessWidget {
  final String selectedLanguage;
  final Map<String, Map<String, String>> translations;
  final AuthService authService = AuthService();

  SubscriptionScreen({
    super.key,
    required this.selectedLanguage,
    required this.translations,
  });

  String t(String key) {
    return translations[selectedLanguage]?[key] ??
        translations['English']![key] ??
        key;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(t('chooseSubscription')),
        centerTitle: true,
        backgroundColor: const Color(0xFFB71C1C),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            onPressed: () async {
              await authService.logout();

              if (context.mounted) {
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const AuthScreen()),
                  (route) => false,
                );
              }
            },
            icon: const Icon(Icons.logout),
            tooltip: t('logout'),
          ),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset(
              'assets/images/ironpilox_logo.png',
              fit: BoxFit.cover,
            ),
          ),
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.18),
            ),
          ),
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 30),
                    _subscriptionCard(
                      title: t('basic'),
                      price: t('free'),
                      subtitle: t('basicSubtitle'),
                      features: [
                        t('routeSearch'),
                        t('truckInput'),
                        t('navAfterAd'),
                      ],
                      buttonText: t('chooseBasic'),
                      buttonColor: const Color(0xFFB71C1C),
                      onPressed: () {
                      Navigator.push(
                      context,
                      MaterialPageRoute(
                      builder: (context) => const MapsDownloadPage(),
                        ),
                      );
                     },
                    ),
                    const SizedBox(height: 20),
                    _subscriptionCard(
                      title: t('premium'),
                      price: t('premiumPrice'),
                      subtitle: t('premiumSubtitle'),
                      features: [
                        t('routeSearch'),
                        t('truckInput'),
                        t('navNoAds'),
                      ],
                      buttonText: t('choosePremium'),
                      buttonColor: const Color(0xFF7F1D1D),
                     onPressed: () {
                      Navigator.push(
                      context,
                     MaterialPageRoute(
                    builder: (context) => const MapsDownloadPage(),
                     ),
                   );
                  },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _subscriptionCard({
    required String title,
    required String price,
    required String subtitle,
    required List<String> features,
    required String buttonText,
    required Color buttonColor,
    required VoidCallback onPressed,
  }) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.96),
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            price,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color(0xFFB71C1C),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 15,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 18),
          ...features.map(
            (feature) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_circle,
                    size: 20,
                    color: Color(0xFFDC2626),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      feature,
                      style: const TextStyle(fontSize: 15),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onPressed,
              style: ElevatedButton.styleFrom(
                backgroundColor: buttonColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                buttonText,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}