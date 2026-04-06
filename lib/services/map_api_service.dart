import 'dart:convert';

import '../config/app_config.dart';
import 'api_http.dart';

class MapInfo {
  final String region;
  final String country;
  final String version;
  final String size;
  final String url;

  MapInfo({
    required this.region,
    required this.country,
    required this.version,
    required this.size,
    required this.url,
  });

  factory MapInfo.fromJson(Map<String, dynamic> json) {
    return MapInfo(
      region: json['region'] ?? '',
      country: json['country'] ?? '',
      version: json['version'] ?? '',
      size: json['size'] ?? '',
      url: json['url'] ?? '',
    );
  }
}

class MapApiService {
  static String get baseUrl => AppConfig.apiRoot;

  static Future<List<MapInfo>> getAllMaps() async {
    final response = await ApiHttp.get(Uri.parse('$baseUrl/maps'));

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((item) => MapInfo.fromJson(item)).toList();
    } else {
      throw Exception('Failed to load maps');
    }
  }
}