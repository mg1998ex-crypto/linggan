import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hive_flutter/hive_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox('ideas'); // 保存点子的盒子
  runApp(const InspirationApp());
}

class InspirationApp extends StatelessWidget {
  const InspirationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '灵感 · 老虎机三词',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const SlotMachinePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class SlotMachinePage extends StatefulWidget {
  const SlotMachinePage({super.key});

  @override
  State<SlotMachinePage> createState() => _SlotMachinePageState();
}

class _SlotMachinePageState extends State<SlotMachinePage>
    with TickerProviderStateMixin {
  // 从 assets/words_zh.txt 读取词库
  List<String> words = [];

  late final FixedExtentScrollController c1;
  late final FixedExtentScrollController c2;
  late final FixedExtentScrollController c3;

  late final AnimationController leverCtrl;
  late final Animation<double> leverTilt;

  bool spinning = false;
  int spinsToday = 0;

  Box get ideasBox => Hive.box('ideas');

  @override
  void initState() {
    super.initState();

    c1 = FixedExtentScrollController();
    c2 = FixedExtentScrollController();
    c3 = FixedExtentScrollController();

    leverCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
      reverseDuration: const Duration(milliseconds: 400),
    );
    leverTilt = Tween(begin: 0.0, end: pi / 10).animate(
      CurvedAnimation(parent: leverCtrl, curve: Curves.easeOut),
    );

    _loadWords();
  }

  Future<void> _loadWords() async {
    try {
      final raw = await rootBundle.loadString('assets/words_zh.txt');
      final list = raw
          .split('\n')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();

      if (list.length < 10) {
        list.addAll(const [
          '字典','声音合成器','计算机','画布','芯片','算法','电池','电台','像素','胶片'
        ]);
      }

      setState(() => words = list);

      WidgetsBinding.instance.addPostFrameCallback((_) => _jumpToRandom());
    } catch (_) {
      setState(() => words = const [
        '字典','声音合成器','计算机','画布','芯片','算法','电池','电台','像素','胶片'
      ]);
      WidgetsBinding.instance.addPostFrameCallback((_) => _jumpToRandom());
    }
  }

  @override
  void dispose() {
    c1.dispose();
    c2.dispose();
    c3.dispose();
    leverCtrl.dispose();
    super.dispose();
  }

  List<String> get currentWords => [
        words[c1.selectedItem % words.length],
        words[c2.selectedItem % words.length],
        words[c3.selectedItem % words.length],
      ];

  void _jumpToRandom() {
    if (words.isEmpty) return;
    final r = Random();
    c1.jumpToItem(r.nextInt(words.length));
    c2.jumpToItem(r.nextInt(words.length));
    c3.jumpToItem(r.nextInt(words.length));
  }

  Future<void> _spin() async {
    if (spinning || words.isEmpty) return;

    setState(() => spinning = true);

    HapticFeedback.mediumImpact();
    unawaited(leverCtrl.forward().then((_) => leverCtrl.reverse()));

    final r = Random(DateTime.now().millisecondsSinceEpoch + spinsToday);

    const baseCycles = 4;
    final targets = [
      c1.selectedItem + baseCycles * words.length + r.nextInt(words.length),
      c2.selectedItem + baseCycles * words.length + r.nextInt(words.length),
      c3.selectedItem + baseCycles * words.length + r.nextInt(words.length),
    ];

    await Future.wait([
      c1.animateToItem(targets[0],
          duration: const Duration(milliseconds: 1400),
          curve: Curves.easeOutCubic),
      c2.animateToItem(targets[1],
          duration: const Duration(milliseconds: 1700),
          curve: Curves.easeOutCubic),
      c3.animateToItem(targets[2],
          duration: const Duration(milliseconds: 2000),
          curve: Curves.easeOutQuart),
    ]);

    setState(() {
      spinsToday++;
      spinning = false;
    });

    HapticFeedback.selectionClick();
  }

  Future<void> _saveCurrentIdea() async {
    final w = currentWords;
    final now = DateTime.now().toIso8601String();
    await ideasBox.add({
      'time': now,
      'words': w,
    });

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('已保存：${w.join(" · ")}')),
    );
  }

  void _openIdeas() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const IdeasPage()),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (words.isEmpty) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('灵感 · 老虎机三词'),
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: '灵感库',
            onPressed: _openIdeas,
            icon: const Icon(Icons.inventory_2_outlined),
          ),
        ],
      ),
      body: Column(
        children: [
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('词库：${words.length} 词',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                Text('已换：$spinsToday 次',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Expanded(
            child: Row(
              children: [
                Expanded(child: _buildReel(c1)),
                Expanded(child: _buildReel(c2)),
                Expanded(child: _buildReel(c3)),
                _buildLever(),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: spinning ? null : _spin,
                    icon: const Icon(Icons.casino),
                    label: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text('拉一下 / 换一组'),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: spinning ? null : _saveCurrentIdea,
                    icon: const Icon(Icons.bookmark_add_outlined),
                    label: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text('保存这组'),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReel(FixedExtentScrollController controller) {
    return ListWheelScrollView.useDelegate(
      controller: controller,
      physics: const FixedExtentScrollPhysics(),
      itemExtent: 50,
      perspective: 0.003,
      childDelegate: ListWheelChildBuilderDelegate(
        childCount: words.length * 100,
        builder: (context, index) {
          final word = words[index % words.length];
          return Center(
            child: Text(
              word,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLever() {
    return GestureDetector(
      onTap: _spin,
      onVerticalDragStart: (_) => _spin(),
      child: AnimatedBuilder(
        animation: leverCtrl,
        builder: (context, child) {
          return Transform.rotate(
            angle: leverTilt.value,
            origin: const Offset(0, 40),
            child: child,
          );
        },
        child: Padding(
          padding: const EdgeInsets.only(right: 12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: const BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                ),
              ),
              Container(width: 6, height: 120, color: Colors.grey),
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  color: Colors.grey.shade400,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class IdeasPage extends StatelessWidget {
  const IdeasPage({super.key});

  Box get box => Hive.box('ideas');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('灵感库'),
        centerTitle: true,
      ),
      body: ValueListenableBuilder(
        valueListenable: box.listenable(),
        builder: (context, Box b, _) {
          if (b.isEmpty) {
            return const Center(
              child: Text('还没有保存的点子\n回到首页点“保存这组”'),
            );
          }

          // 倒序显示（最新在上）
          final keys = b.keys.toList().reversed.toList();

          return ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: keys.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final key = keys[i];
              final item = b.get(key);

              final words = (item is Map && item['words'] is List)
                  ? (item['words'] as List).map((e) => e.toString()).toList()
                  : <String>[];

              final timeStr = (item is Map && item['time'] is String)
                  ? item['time'] as String
                  : '';

              final title = words.isEmpty ? '（无内容）' : words.join(' · ');

              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700)),
                      if (timeStr.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(timeStr,
                            style: const TextStyle(color: Colors.black54)),
                      ],
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          TextButton.icon(
                            onPressed: () async {
                              await Clipboard.setData(ClipboardData(text: title));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('已复制到剪贴板')),
                              );
                            },
                            icon: const Icon(Icons.copy, size: 18),
                            label: const Text('复制'),
                          ),
                          const Spacer(),
                          TextButton.icon(
                            onPressed: () async {
                              await b.delete(key);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('已删除')),
                              );
                            },
                            icon: const Icon(Icons.delete_outline, size: 18),
                            label: const Text('删除'),
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}