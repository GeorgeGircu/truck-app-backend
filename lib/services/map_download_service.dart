import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DownloadedMapItem {
  final String region;
  final String country;
  final String version;
  final String size;
  final String localPath;

  DownloadedMapItem({
    required this.region,
    required this.country,
    required this.version,
    required this.size,
    required this.localPath,
  });

  Map<String, dynamic> toJson() {
    return {
      'region': region,
      'country': country,
      'version': version,
      'size': size,
      'localPath': localPath,
    };
  }

  factory DownloadedMapItem.fromJson(Map<String, dynamic> json) {
    return DownloadedMapItem(
      region: json['region'] ?? '',
      country: json['country'] ?? '',
      version: json['version'] ?? '',
      size: json['size'] ?? '',
      localPath: json['localPath'] ?? '',
    );
  }
}

class MapDownloadService {
  static const String _storageKey = 'downloaded_maps';

  static Future<String> _mapsDirectoryPath() async {
    final dir = await getApplicationDocumentsDirectory();
    final mapsDir = Directory('${dir.path}/maps');

    if (!await mapsDir.exists()) {
      await mapsDir.create(recursive: true);
    }

    return mapsDir.path;
  }

  static Future<String> getLocalFilePath(String region) async {
    final mapsDir = await _mapsDirectoryPath();
    return '$mapsDir/$region.mbtiles';
  }

  static Future<List<DownloadedMapItem>> getDownloadedMaps() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);

    if (raw == null || raw.isEmpty) {
      return [];
    }

    final List<dynamic> decoded = jsonDecode(raw);
    final items =
        decoded.map((e) => DownloadedMapItem.fromJson(e)).toList();

    final validItems = <DownloadedMapItem>[];
    for (final item in items) {
      final file = File(item.localPath);
      if (await file.exists()) {
        validItems.add(item);
      }
    }

    if (validItems.length != items.length) {
      await _saveDownloadedMaps(validItems);
    }

    return validItems;
  }

  static Future<void> _saveDownloadedMaps(List<DownloadedMapItem> maps) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = jsonEncode(maps.map((e) => e.toJson()).toList());
    await prefs.setString(_storageKey, raw);
  }

  static Future<String> downloadMap({
    required String region,
    required String country,
    required String version,
    required String size,
    required String url,
    Function(int received, int total)? onReceiveProgress,
  }) async {
    final filePath = await getLocalFilePath(region);

    await Dio().download(
      url,
      filePath,
      deleteOnError: true,
      onReceiveProgress: onReceiveProgress,
    );

    final downloadedMaps = await getDownloadedMaps();

    downloadedMaps.removeWhere((m) => m.region == region);
    downloadedMaps.add(
      DownloadedMapItem(
        region: region,
        country: country,
        version: version,
        size: size,
        localPath: filePath,
      ),
    );

    await _saveDownloadedMaps(downloadedMaps);

    return filePath;
  }

  static Future<void> deleteMap(String region) async {
    final downloadedMaps = await getDownloadedMaps();
    final index = downloadedMaps.indexWhere((m) => m.region == region);

    if (index == -1) {
      return;
    }

    final item = downloadedMaps[index];
    final file = File(item.localPath);

    if (await file.exists()) {
      await file.delete();
    }

    downloadedMaps.removeAt(index);
    await _saveDownloadedMaps(downloadedMaps);
  }
}