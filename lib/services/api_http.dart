import 'package:http/http.dart' as http;

/// Timeout lung pentru host-uri care „adorm” (ex. Render free tier).
class ApiHttp {
  ApiHttp._();

  static const Duration timeout = Duration(seconds: 120);

  static Future<http.Response> postJson(Uri uri, {required String body}) {
    return http
        .post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: body,
        )
        .timeout(timeout);
  }

  static Future<http.Response> get(Uri uri) {
    return http.get(uri).timeout(timeout);
  }
}
