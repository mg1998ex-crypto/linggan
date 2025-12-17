import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
  // ✅ 从 assets/words_zh.txt 读取词库（不再写死在代码里）
  List<String> words = [];

  late final FixedExtentScrollController c1;
  late final FixedExtentScrollController c2;
  late final FixedExtentScrollController c3;

  late final AnimationController leverCtrl;
  late final Animation<double> leverTilt;

  bool spinning = false;
  int spinsToday = 0;

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

    // ✅ 启动时加载词库
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

      // 兜底：如果文件里太少，避免体验太差
      if (list.length < 10) {
        list.addAll(const ['字典', '声音合成器', '计算机', '画布', '芯片', '算法', '电池', '电台', '像素', '胶片']);
      }

      setState(() {
        words = list;
      });

      // ✅ 词库加载完成后，随机跳一下
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _jumpToRandom();
      });
    } catch (e) {
      // 如果 assets 配置没生效或文件不存在，会走到这里
      setState(() {
        words = const ['字典', '声音合成器', '计算机', '画布', '芯片', '算法', '电池', '电台', '像素', '胶片'];
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _jumpToRandom();
      });
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

  void _jumpToRandom() {
    if (words.isEmpty) return;
    final r = Random();
    c1.jumpToItem(r.nextInt(words.length));
    c2.jumpToItem(r.nextInt(words.length));
    c3.jumpToItem(r.nextInt(words.length));
  }

  Future<void> _spin() async {
    if (spinning) return;
    if (words.isEmpty) return;

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
      c1.animateToItem(
        targets[0],
        duration: const Duration(milliseconds: 1400),
        curve: Curves.easeOutCubic,
      ),
      c2.animateToItem(
        targets[1],
        duration: const Duration(milliseconds: 1700),
        curve: Curves.easeOutCubic,
      ),
      c3.animateToItem(
        targets[2],
        duration: const Duration(milliseconds: 2000),
        curve: Curves.easeOutQuart,
      ),
    ]);

    setState(() {
      spinsToday++;
      spinning = false;
    });

    HapticFeedback.selectionClick();
  }

  @override
  Widget build(BuildContext context) {
    // ✅ 词库未加载完：显示加载界面（避免 words.length=0 崩溃）
    if (words.isEmpty) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('灵感 · 老虎机三词'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          const SizedBox(height: 12),
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
          const SizedBox(height: 12),
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
            padding: const EdgeInsets.all(16),
            child: ElevatedButton.icon(
              onPressed: spinning ? null : _spin,
              icon: const Icon(Icons.casino),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text('拉一下 / 换一组'),
              ),
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
              Container(
                width: 6,
                height: 120,
                color: Colors.grey,
              ),
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