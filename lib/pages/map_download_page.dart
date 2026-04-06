import 'package:flutter/material.dart';

import '../services/map_api_service.dart';
import '../services/map_download_service.dart';

class MapsDownloadPage extends StatefulWidget {
  const MapsDownloadPage({super.key});

  @override
  State<MapsDownloadPage> createState() => _MapsDownloadPageState();
}

class _MapsDownloadPageState extends State<MapsDownloadPage> {
  List<MapInfo> availableMaps = [];
  List<DownloadedMapItem> downloadedMaps = [];
  final Set<String> selectedRegions = {};

  MapInfo? selectedMap;
  bool isLoading = true;
  bool isDownloading = false;
  double downloadProgress = 0;
  String downloadStatus = '';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final maps = await MapApiService.getAllMaps();
      final downloaded = await MapDownloadService.getDownloadedMaps();

      setState(() {
        availableMaps = maps;
        downloadedMaps = downloaded;
        if (maps.isNotEmpty) {
          selectedMap = maps.first;
        }
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        isLoading = false;
        downloadStatus = 'Error loading maps: $e';
      });
    }
  }

  Future<void> _downloadSelectedMap() async {
    final map = selectedMap;
    if (map == null) return;

    setState(() {
      isDownloading = true;
      downloadProgress = 0;
      downloadStatus = 'Downloading ${map.country}...';
    });

    try {
      await MapDownloadService.downloadMap(
        region: map.region,
        country: map.country,
        version: map.version,
        size: map.size,
        url: map.url,
        onReceiveProgress: (received, total) {
          if (total > 0) {
            setState(() {
              downloadProgress = received / total;
            });
          }
        },
      );

      final downloaded = await MapDownloadService.getDownloadedMaps();

      setState(() {
        downloadedMaps = downloaded;
        isDownloading = false;
        downloadStatus = '${map.country} downloaded successfully';
      });
    } catch (e) {
      setState(() {
        isDownloading = false;
        downloadStatus = 'Download failed: $e';
      });
    }
  }

  Future<void> _deleteMap(String region) async {
    await MapDownloadService.deleteMap(region);
    final downloaded = await MapDownloadService.getDownloadedMaps();

    setState(() {
      downloadedMaps = downloaded;
      selectedRegions.remove(region);
    });
  }

  void _toggleSelection(String region, bool? value) {
    setState(() {
      if (value == true) {
        selectedRegions.add(region);
      } else {
        selectedRegions.remove(region);
      }
    });
  }

  void _showMap() {
    if (selectedRegions.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select at least one downloaded map'),
        ),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Show Map coming next. Selected: ${selectedRegions.join(', ')}',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Download Maps'),
        centerTitle: true,
        backgroundColor: const Color(0xFFB71C1C),
        foregroundColor: Colors.white,
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
              color: Colors.black.withValues(alpha: 0.18),
            ),
          ),
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 720),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildDownloadCard(),
                    const SizedBox(height: 20),
                    _buildDownloadedMapsCard(),
                    const SizedBox(height: 20),
                    SizedBox(
                      height: 54,
                      child: ElevatedButton(
                        onPressed: _showMap,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF7F1D1D),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: const Text(
                          'Show Map',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDownloadCard() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.96),
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
          const Text(
            'Download a map',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<MapInfo>(
            initialValue: selectedMap,
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            items: availableMaps.map((map) {
              return DropdownMenuItem<MapInfo>(
                value: map,
                child: Text('${map.country} (${map.size})'),
              );
            }).toList(),
            onChanged: isDownloading
                ? null
                : (value) {
                    setState(() {
                      selectedMap = value;
                    });
                  },
          ),
          const SizedBox(height: 16),
          if (isDownloading) ...[
            LinearProgressIndicator(value: downloadProgress),
            const SizedBox(height: 8),
            Text('${(downloadProgress * 100).toStringAsFixed(0)}%'),
            const SizedBox(height: 8),
          ],
          if (downloadStatus.isNotEmpty) ...[
            Text(
              downloadStatus,
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 12),
          ],
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: isDownloading ? null : _downloadSelectedMap,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB71C1C),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                isDownloading ? 'Downloading...' : 'Download Selected Map',
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

  Widget _buildDownloadedMapsCard() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.96),
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
          const Text(
            'Downloaded maps',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 16),
          if (downloadedMaps.isEmpty)
            const Text(
              'No maps downloaded yet.',
              style: TextStyle(fontSize: 15),
            )
          else
            ...downloadedMaps.map(
              (map) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8F8F8),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.black12),
                ),
                child: Row(
                  children: [
                    Checkbox(
                      value: selectedRegions.contains(map.region),
                      onChanged: (value) =>
                          _toggleSelection(map.region, value),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            map.country,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text('Version: ${map.version}'),
                          Text('Size: ${map.size}'),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => _deleteMap(map.region),
                      icon: const Icon(Icons.delete, color: Colors.red),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}