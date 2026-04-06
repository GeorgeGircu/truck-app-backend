import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'api_http.dart';

class AuthService {
  static const _storage = FlutterSecureStorage();

  static String get baseUrl => AppConfig.authApiRoot;

  Future<Map<String, dynamic>> register(String email, String password) async {
    try {
      final response = await ApiHttp.postJson(
        Uri.parse('$baseUrl/register'),
        body: jsonEncode({
          'email': email.trim(),
          'password': password,
        }),
      );

      final data = _parseResponse(response);

      if (response.statusCode == 201 || response.statusCode == 200) {
  return {
    'success': true,
    'code': data['code'] ?? 'REGISTER_SUCCESS',
    'data': data,
   };
 }

      return {
        'success': false,
        'code': _extractErrorCode(data),
        'message': data['message'],
      };
    } catch (e) {
      return {
        'success': false,
        'code': 'SERVER_ERROR',
        'message': e.toString(),
      };
    }
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await ApiHttp.postJson(
        Uri.parse('$baseUrl/login'),
        body: jsonEncode({
          'email': email.trim(),
          'password': password,
        }),
      );

      final data = _parseResponse(response);

      if (response.statusCode == 200) {
        final token = data['token'];
        if (token != null) {
          await _storage.write(key: 'auth_token', value: token);
        }

        return {
          'success': true,
          'code': 'LOGIN_SUCCESS',
          'data': data,
        };
      }

      return {
        'success': false,
        'code': _extractErrorCode(data),
        'message': data['message'],
      };
    } catch (e) {
      return {
        'success': false,
        'code': 'SERVER_ERROR',
        'message': e.toString(),
      };
    }
  }

  Future<Map<String, dynamic>> verifyEmail(String email, String code) async {
    try {
      final response = await ApiHttp.postJson(
        Uri.parse('$baseUrl/verify-email'),
        body: jsonEncode({
          'email': email.trim(),
          'code': code.trim(),
        }),
      );

      final data = _parseResponse(response);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'code': 'EMAIL_VERIFIED',
          'data': data,
        };
      }

      return {
        'success': false,
        'code': _extractErrorCode(data),
        'message': data['message'],
      };
    } catch (e) {
      return {
        'success': false,
        'code': 'SERVER_ERROR',
        'message': e.toString(),
      };
    }
  }

  Future<Map<String, dynamic>> resendVerificationCode(String email) async {
    try {
      final response = await ApiHttp.postJson(
        Uri.parse('$baseUrl/resend-code'),
        body: jsonEncode({
          'email': email.trim(),
        }),
      );

      final data = _parseResponse(response);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'code': 'CODE_RESENT',
          'data': data,
        };
      }

      return {
        'success': false,
        'code': _extractErrorCode(data),
        'message': data['message'],
      };
    } catch (e) {
      return {
        'success': false,
        'code': 'SERVER_ERROR',
        'message': e.toString(),
      };
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await ApiHttp.postJson(
        Uri.parse('$baseUrl/forgot-password'),
        body: jsonEncode({
          'email': email.trim(),
        }),
      );

      final data = _parseResponse(response);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'code': 'RESET_EMAIL_SENT',
          'data': data,
        };
      }

      return {
        'success': false,
        'code': _extractErrorCode(data),
        'message': data['message'],
      };
    } catch (e) {
      return {
        'success': false,
        'code': 'SERVER_ERROR',
        'message': e.toString(),
      };
    }
  }

  Future<Map<String, dynamic>> resetPassword(
    String token,
    String password,
  ) async {
    try {
      final response = await ApiHttp.postJson(
        Uri.parse('$baseUrl/reset-password/$token'),
        body: jsonEncode({
          'password': password,
        }),
      );

      final data = _parseResponse(response);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'code': 'PASSWORD_RESET_SUCCESS',
          'data': data,
        };
      }

      return {
        'success': false,
        'code': _extractErrorCode(data),
        'message': data['message'],
      };
    } catch (e) {
      return {
        'success': false,
        'code': 'SERVER_ERROR',
        'message': e.toString(),
      };
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'auth_token');
    return token != null && token.isNotEmpty;
  }

  Future<void> logout() async {
    await _storage.delete(key: 'auth_token');
  }

  Map<String, dynamic> _parseResponse(http.Response response) {
    try {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      return {'message': response.body};
    }
  }

  String _extractErrorCode(Map<String, dynamic> data) {
    if (data['code'] != null && data['code'].toString().isNotEmpty) {
      return data['code'].toString();
    }

    final message = (data['message'] ?? '').toString().trim();

    switch (message) {
      case 'Email și parola sunt obligatorii':
      case 'Email and password are required':
        return 'MISSING_FIELDS';

      case 'Utilizatorul există deja':
      case 'User already exists':
        return 'USER_ALREADY_EXISTS';

      case 'Date invalide':
      case 'Invalid credentials':
        return 'INVALID_CREDENTIALS';

      case 'Utilizatorul nu există':
      case 'User not found':
        return 'USER_NOT_FOUND';

      case 'Emailul este obligatoriu':
      case 'Email is required':
        return 'EMAIL_REQUIRED';

      case 'Parola nouă este obligatorie':
      case 'Password is required':
        return 'PASSWORD_REQUIRED';

      case 'Token invalid sau expirat':
      case 'Invalid or expired token':
        return 'INVALID_OR_EXPIRED_TOKEN';

      case 'Cod invalid sau expirat':
      case 'Invalid or expired code':
        return 'INVALID_OR_EXPIRED_CODE';

      case 'Email verificat cu succes':
      case 'Email verified successfully':
        return 'EMAIL_VERIFIED';

      case 'Email de resetare trimis cu succes':
      case 'Reset email sent successfully':
        return 'RESET_EMAIL_SENT';

      case 'Parola a fost resetată cu succes':
      case 'Password reset successfully':
        return 'PASSWORD_RESET_SUCCESS';

      default:
        if (message.toLowerCase().contains('server')) {
          return 'SERVER_ERROR';
        }
        return 'SERVER_ERROR';
    }
  }
}