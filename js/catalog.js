// PatchBoards · catalog.js
// Curated software catalog — Mac (Homebrew) and Windows (winget).
// brew: cask name for homebrew-cask, brewFormula: name for homebrew formula
// winget: winget package ID
// github: "owner/repo" for apps that publish official GitHub Releases

const CATALOG = [
  // ── Browsers ────────────────────────────────────────────────────────────────
  { id: 'google-chrome',   name: 'Google Chrome',         category: 'Browser',       icon: '🌐', desc: 'Fast, secure browser by Google',                    platforms: ['mac','win'], brew: 'google-chrome',        winget: 'Google.Chrome' },
  { id: 'firefox',         name: 'Mozilla Firefox',       category: 'Browser',       icon: '🦊', desc: 'Fast browser with strong privacy features',         platforms: ['mac','win'], brew: 'firefox',              winget: 'Mozilla.Firefox' },
  { id: 'microsoft-edge',  name: 'Microsoft Edge',        category: 'Browser',       icon: '🌐', desc: 'Chromium-based browser by Microsoft',               platforms: ['mac','win'], brew: 'microsoft-edge',       winget: 'Microsoft.Edge' },
  { id: 'brave-browser',   name: 'Brave',                 category: 'Browser',       icon: '🦁', desc: 'Privacy-focused browser with built-in ad blocking', platforms: ['mac','win'], brew: 'brave-browser',        winget: 'Brave.Brave',                          github: 'brave/brave-browser' },
  { id: 'arc',             name: 'Arc',                   category: 'Browser',       icon: '🌈', desc: 'Modern browser with workspace organization',        platforms: ['mac'],       brew: 'arc',                  winget: null },
  { id: 'opera',           name: 'Opera',                 category: 'Browser',       icon: '🎭', desc: 'Browser with built-in VPN and ad blocker',         platforms: ['mac','win'], brew: 'opera',                winget: 'Opera.Opera' },
  { id: 'vivaldi',         name: 'Vivaldi',               category: 'Browser',       icon: '🎵', desc: 'Highly customizable browser for power users',      platforms: ['mac','win'], brew: 'vivaldi',              winget: 'VivaldiTechnologies.Vivaldi' },
  { id: 'tor-browser',     name: 'Tor Browser',           category: 'Browser',       icon: '🧅', desc: 'Anonymous browsing via the Tor network',           platforms: ['mac','win'], brew: 'tor-browser',          winget: 'TorProject.TorBrowser' },

  // ── Developer Tools ──────────────────────────────────────────────────────────
  { id: 'visual-studio-code', name: 'VS Code',            category: 'Developer',     icon: '⚙️', desc: 'Popular source code editor by Microsoft',          platforms: ['mac','win'], brew: 'visual-studio-code',   winget: 'Microsoft.VisualStudioCode',           github: 'microsoft/vscode' },
  { id: 'cursor',          name: 'Cursor',                category: 'Developer',     icon: '🖱️', desc: 'AI-powered code editor built on VS Code',          platforms: ['mac','win'], brew: 'cursor',               winget: 'Anysphere.Cursor' },
  { id: 'zed',             name: 'Zed',                   category: 'Developer',     icon: '⚡', desc: 'High-performance multiplayer code editor',          platforms: ['mac'],       brew: 'zed',                  winget: null },
  { id: 'sublime-text',    name: 'Sublime Text',          category: 'Developer',     icon: '✨', desc: 'Sophisticated text editor for code and prose',      platforms: ['mac','win'], brew: 'sublime-text',         winget: 'SublimeHQ.SublimeText.4' },
  { id: 'github-desktop',  name: 'GitHub Desktop',        category: 'Developer',     icon: '🐙', desc: 'Simplified Git workflow by GitHub',                 platforms: ['mac','win'], brew: 'github',               winget: 'GitHub.GitHubDesktop',                github: 'desktop/desktop' },
  { id: 'sourcetree',      name: 'Sourcetree',            category: 'Developer',     icon: '🌲', desc: 'Free Git client by Atlassian',                      platforms: ['mac','win'], brew: 'sourcetree',           winget: 'Atlassian.Sourcetree' },
  { id: 'iterm2',          name: 'iTerm2',                category: 'Developer',     icon: '💻', desc: 'Feature-rich terminal emulator for macOS',          platforms: ['mac'],       brew: 'iterm2',               winget: null },
  { id: 'warp',            name: 'Warp',                  category: 'Developer',     icon: '🚀', desc: 'Modern terminal with AI features',                  platforms: ['mac'],       brew: 'warp',                 winget: null },
  { id: 'windows-terminal',name: 'Windows Terminal',      category: 'Developer',     icon: '🖥️', desc: 'Modern terminal for Windows by Microsoft',          platforms: ['win'],       brew: null,                   winget: 'Microsoft.WindowsTerminal',            github: 'microsoft/terminal' },
  { id: 'docker',          name: 'Docker Desktop',        category: 'Developer',     icon: '🐳', desc: 'Container platform for developers',                 platforms: ['mac','win'], brew: 'docker',               winget: 'Docker.DockerDesktop' },
  { id: 'postman',         name: 'Postman',               category: 'Developer',     icon: '📮', desc: 'API testing and development platform',              platforms: ['mac','win'], brew: 'postman',              winget: 'Postman.Postman' },
  { id: 'insomnia',        name: 'Insomnia',              category: 'Developer',     icon: '😴', desc: 'REST and GraphQL API client',                       platforms: ['mac','win'], brew: 'insomnia',             winget: 'Insomnia.Insomnia',                    github: 'Kong/insomnia' },
  { id: 'tableplus',       name: 'TablePlus',             category: 'Developer',     icon: '🗄️', desc: 'Modern database management GUI',                    platforms: ['mac','win'], brew: 'tableplus',            winget: 'TablePlus.TablePlus' },
  { id: 'dbeaver-community',name: 'DBeaver',              category: 'Developer',     icon: '🗃️', desc: 'Universal database tool for developers',            platforms: ['mac','win'], brew: 'dbeaver-community',    winget: 'dbeaver.dbeaver',                      github: 'dbeaver/dbeaver' },
  { id: 'jetbrains-toolbox',name: 'JetBrains Toolbox',   category: 'Developer',     icon: '🛠️', desc: 'Manager for JetBrains IDEs and projects',           platforms: ['mac','win'], brew: 'jetbrains-toolbox',    winget: 'JetBrains.Toolbox' },
  { id: 'android-studio',  name: 'Android Studio',        category: 'Developer',     icon: '📱', desc: 'Official IDE for Android development',              platforms: ['mac','win'], brew: 'android-studio',       winget: 'Google.AndroidStudio' },
  { id: 'xcode',           name: 'Xcode',                 category: 'Developer',     icon: '🍎', desc: 'Apple IDE for macOS, iOS, and more',                platforms: ['mac'],       brew: null,                   winget: null, homepage: 'https://developer.apple.com/xcode/' },
  { id: 'proxyman',        name: 'Proxyman',              category: 'Developer',     icon: '🔍', desc: 'HTTP debugging proxy for macOS',                    platforms: ['mac'],       brew: 'proxyman',             winget: null },
  { id: 'wireshark',       name: 'Wireshark',             category: 'Developer',     icon: '🦈', desc: 'Network protocol analyzer',                         platforms: ['mac','win'], brew: 'wireshark',            winget: 'WiresharkFoundation.Wireshark',        github: 'wireshark/wireshark' },
  { id: 'filezilla',       name: 'FileZilla',             category: 'Developer',     icon: '📂', desc: 'FTP client and server',                             platforms: ['mac','win'], brew: 'filezilla',            winget: 'TimKosse.FileZillaClient' },
  { id: 'git',             name: 'Git',                   category: 'Developer',     icon: '🔀', desc: 'Distributed version control system', brewType: 'formula', platforms: ['mac','win'], brew: 'git',          winget: 'Git.Git',                              github: 'git-for-windows/git' },

  // ── Communication ────────────────────────────────────────────────────────────
  { id: 'slack',           name: 'Slack',                 category: 'Communication', icon: '💬', desc: 'Team messaging and collaboration platform',         platforms: ['mac','win'], brew: 'slack',                winget: 'SlackTechnologies.Slack' },
  { id: 'discord',         name: 'Discord',               category: 'Communication', icon: '🎮', desc: 'Voice, video, and text for communities',            platforms: ['mac','win'], brew: 'discord',              winget: 'Discord.Discord' },
  { id: 'microsoft-teams', name: 'Microsoft Teams',       category: 'Communication', icon: '👥', desc: 'Workplace collaboration by Microsoft',              platforms: ['mac','win'], brew: 'microsoft-teams',      winget: 'Microsoft.Teams' },
  { id: 'zoom',            name: 'Zoom',                  category: 'Communication', icon: '📹', desc: 'Video conferencing and online meetings',            platforms: ['mac','win'], brew: 'zoom',                 winget: 'Zoom.Zoom' },
  { id: 'telegram',        name: 'Telegram',              category: 'Communication', icon: '✈️', desc: 'Fast, secure messaging app',                        platforms: ['mac','win'], brew: 'telegram',             winget: 'Telegram.TelegramDesktop',             github: 'telegramdesktop/tdesktop' },
  { id: 'signal',          name: 'Signal',                category: 'Communication', icon: '🔐', desc: 'Private, end-to-end encrypted messaging',           platforms: ['mac','win'], brew: 'signal',               winget: 'OpenWhisperSystems.Signal',             github: 'signalapp/Signal-Desktop' },
  { id: 'whatsapp',        name: 'WhatsApp',              category: 'Communication', icon: '📱', desc: 'Messaging app by Meta',                             platforms: ['mac','win'], brew: 'whatsapp',             winget: 'WhatsApp.WhatsApp' },
  { id: 'skype',           name: 'Skype',                 category: 'Communication', icon: '📞', desc: 'Video and voice calls by Microsoft',                platforms: ['mac','win'], brew: 'skype',                winget: 'Microsoft.Skype' },
  { id: 'webex',           name: 'Webex',                 category: 'Communication', icon: '🔵', desc: 'Video conferencing by Cisco',                       platforms: ['mac','win'], brew: 'webex',                winget: 'Cisco.WebexTeams' },

  // ── Productivity ─────────────────────────────────────────────────────────────
  { id: 'notion',          name: 'Notion',                category: 'Productivity',  icon: '📝', desc: 'All-in-one workspace for notes and projects',       platforms: ['mac','win'], brew: 'notion',               winget: 'Notion.Notion' },
  { id: 'obsidian',        name: 'Obsidian',              category: 'Productivity',  icon: '💎', desc: 'Markdown knowledge base and note-taking app',       platforms: ['mac','win'], brew: 'obsidian',             winget: 'Obsidian.Obsidian',                    github: 'obsidianmd/obsidian-releases' },
  { id: '1password',       name: '1Password',             category: 'Productivity',  icon: '🔑', desc: 'Password manager for individuals and teams',        platforms: ['mac','win'], brew: '1password',            winget: 'AgileBits.1Password' },
  { id: 'bitwarden',       name: 'Bitwarden',             category: 'Productivity',  icon: '🔒', desc: 'Open-source password manager',                      platforms: ['mac','win'], brew: 'bitwarden',            winget: 'Bitwarden.Bitwarden' },
  { id: 'raycast',         name: 'Raycast',               category: 'Productivity',  icon: '🔦', desc: 'macOS productivity launcher and automation',        platforms: ['mac'],       brew: 'raycast',              winget: null },
  { id: 'alfred',          name: 'Alfred',                category: 'Productivity',  icon: '🎩', desc: 'macOS launcher with workflows and clipboard',       platforms: ['mac'],       brew: 'alfred',               winget: null },
  { id: 'todoist',         name: 'Todoist',               category: 'Productivity',  icon: '✅', desc: 'Task manager and to-do list',                       platforms: ['mac','win'], brew: 'todoist',              winget: 'Doist.Todoist' },
  { id: 'loom',            name: 'Loom',                  category: 'Productivity',  icon: '🎥', desc: 'Screen recorder and video messaging',               platforms: ['mac','win'], brew: 'loom',                 winget: 'Loom.Loom' },
  { id: 'dropbox',         name: 'Dropbox',               category: 'Productivity',  icon: '📦', desc: 'Cloud storage and file sync',                       platforms: ['mac','win'], brew: 'dropbox',              winget: 'Dropbox.Dropbox' },
  { id: 'google-drive',    name: 'Google Drive',          category: 'Productivity',  icon: '☁️', desc: 'Cloud storage and backup by Google',                platforms: ['mac','win'], brew: 'google-drive',         winget: 'Google.GoogleDrive' },
  { id: 'evernote',        name: 'Evernote',              category: 'Productivity',  icon: '🐘', desc: 'Note-taking and organization app',                  platforms: ['mac','win'], brew: 'evernote',             winget: 'Evernote.Evernote' },
  { id: 'libreoffice',     name: 'LibreOffice',           category: 'Productivity',  icon: '📄', desc: 'Free, open-source office suite',                    platforms: ['mac','win'], brew: 'libreoffice',          winget: 'TheDocumentFoundation.LibreOffice' },
  { id: 'microsoft-office',name: 'Microsoft Office',      category: 'Productivity',  icon: '📊', desc: 'Microsoft Office Suite (Word, Excel, PowerPoint)',  platforms: ['mac','win'], brew: 'microsoft-office',     winget: 'Microsoft.Office' },
  { id: 'typora',          name: 'Typora',                category: 'Productivity',  icon: '📖', desc: 'Minimal, distraction-free Markdown editor',         platforms: ['mac','win'], brew: 'typora',               winget: 'typora.typora' },
  { id: 'bear',            name: 'Bear',                  category: 'Productivity',  icon: '🐻', desc: 'Beautiful note-taking app for Mac and iOS',         platforms: ['mac'],       brew: 'bear',                 winget: null },

  // ── Media ────────────────────────────────────────────────────────────────────
  { id: 'spotify',         name: 'Spotify',               category: 'Media',         icon: '🎵', desc: 'Music and podcast streaming service',               platforms: ['mac','win'], brew: 'spotify',              winget: 'Spotify.Spotify' },
  { id: 'vlc',             name: 'VLC',                   category: 'Media',         icon: '🎬', desc: 'Open-source, cross-platform media player',          platforms: ['mac','win'], brew: 'vlc',                  winget: 'VideoLAN.VLC' },
  { id: 'iina',            name: 'IINA',                  category: 'Media',         icon: '▶️', desc: 'Modern, native media player for macOS',             platforms: ['mac'],       brew: 'iina',                 winget: null },
  { id: 'handbrake',       name: 'HandBrake',             category: 'Media',         icon: '🎞️', desc: 'Open-source video transcoder',                      platforms: ['mac','win'], brew: 'handbrake',            winget: 'HandBrake.HandBrake',                  github: 'HandBrake/HandBrake' },
  { id: 'obs',             name: 'OBS Studio',            category: 'Media',         icon: '📽️', desc: 'Free streaming and screen recording software',      platforms: ['mac','win'], brew: 'obs',                  winget: 'OBSProject.OBSStudio',                 github: 'obsproject/obs-studio' },
  { id: 'plex',            name: 'Plex',                  category: 'Media',         icon: '🎭', desc: 'Personal media server and player',                  platforms: ['mac','win'], brew: 'plex',                 winget: 'Plex.Plexamp' },
  { id: 'audacity',        name: 'Audacity',              category: 'Media',         icon: '🎙️', desc: 'Free, open-source audio editor',                    platforms: ['mac','win'], brew: 'audacity',             winget: 'Audacity.Audacity',                    github: 'audacity/audacity' },
  { id: 'kodi',            name: 'Kodi',                  category: 'Media',         icon: '📺', desc: 'Open-source home theater software',                 platforms: ['mac','win'], brew: 'kodi',                 winget: 'XBMCFoundation.Kodi',                  github: 'xbmc/xbmc' },

  // ── Design ───────────────────────────────────────────────────────────────────
  { id: 'figma',           name: 'Figma',                 category: 'Design',        icon: '🎨', desc: 'Collaborative design and prototyping tool',         platforms: ['mac','win'], brew: 'figma',                winget: 'Figma.Figma' },
  { id: 'sketch',          name: 'Sketch',                category: 'Design',        icon: '✏️', desc: 'Vector graphics editor for macOS UI design',        platforms: ['mac'],       brew: 'sketch',               winget: null },
  { id: 'adobe-creative-cloud', name: 'Adobe Creative Cloud', category: 'Design',   icon: '🌟', desc: 'Hub for all Adobe creative apps',                   platforms: ['mac','win'], brew: 'adobe-creative-cloud', winget: 'Adobe.CreativeCloud' },
  { id: 'inkscape',        name: 'Inkscape',              category: 'Design',        icon: '🖊️', desc: 'Free, open-source vector graphics editor',          platforms: ['mac','win'], brew: 'inkscape',             winget: 'Inkscape.Inkscape',                    github: 'inkscape/inkscape' },
  { id: 'gimp',            name: 'GIMP',                  category: 'Design',        icon: '🖼️', desc: 'Free, open-source image editor',                    platforms: ['mac','win'], brew: 'gimp',                 winget: 'GIMP.GIMP' },
  { id: 'blender',         name: 'Blender',               category: 'Design',        icon: '🌀', desc: 'Open-source 3D creation suite',                     platforms: ['mac','win'], brew: 'blender',              winget: 'BlenderFoundation.Blender' },

  // ── Security ─────────────────────────────────────────────────────────────────
  { id: 'malwarebytes',    name: 'Malwarebytes',          category: 'Security',      icon: '🛡️', desc: 'Anti-malware and cybersecurity software',           platforms: ['mac','win'], brew: 'malwarebytes',         winget: 'Malwarebytes.Malwarebytes' },
  { id: 'keepassxc',       name: 'KeePassXC',             category: 'Security',      icon: '🗝️', desc: 'Open-source cross-platform password manager',       platforms: ['mac','win'], brew: 'keepassxc',            winget: 'KeePassXCTeam.KeePassXC',              github: 'keepassxc/keepassxc' },
  { id: 'little-snitch',   name: 'Little Snitch',         category: 'Security',      icon: '🕵️', desc: 'Network monitor and outbound firewall for macOS',   platforms: ['mac'],       brew: 'little-snitch',        winget: null },
  { id: 'nordvpn',         name: 'NordVPN',               category: 'Security',      icon: '🌐', desc: 'VPN service for privacy and security',              platforms: ['mac','win'], brew: 'nordvpn',              winget: 'NordVPN.NordVPN' },
  { id: 'expressvpn',      name: 'ExpressVPN',            category: 'Security',      icon: '🔐', desc: 'Fast and secure VPN service',                       platforms: ['mac','win'], brew: 'expressvpn',           winget: 'ExpressVPN.ExpressVPN' },
  { id: 'veracrypt',       name: 'VeraCrypt',             category: 'Security',      icon: '🔏', desc: 'Open-source disk encryption software',              platforms: ['mac','win'], brew: 'veracrypt',            winget: 'IDRIX.VeraCrypt',                      github: 'veracrypt/VeraCrypt' },

  // ── Utilities ────────────────────────────────────────────────────────────────
  { id: 'the-unarchiver',  name: 'The Unarchiver',        category: 'Utilities',     icon: '📁', desc: 'Archive extractor supporting many formats on macOS', platforms: ['mac'],       brew: 'the-unarchiver',       winget: null },
  { id: '7zip',            name: '7-Zip',                 category: 'Utilities',     icon: '🗜️', desc: 'File archiver with high compression ratio',          platforms: ['win'],       brew: null,                   winget: '7zip.7zip',                            github: 'ip7z/7zip' },
  { id: 'rectangle',       name: 'Rectangle',             category: 'Utilities',     icon: '⬜', desc: 'Window management for macOS with keyboard shortcuts',platforms: ['mac'],       brew: 'rectangle',            winget: null },
  { id: 'appcleaner',      name: 'AppCleaner',            category: 'Utilities',     icon: '🧹', desc: 'Thoroughly uninstall unwanted apps on macOS',       platforms: ['mac'],       brew: 'appcleaner',           winget: null },
  { id: 'balenaetcher',    name: 'balenaEtcher',          category: 'Utilities',     icon: '💾', desc: 'Flash OS images to SD cards and USB drives',        platforms: ['mac','win'], brew: 'balenaetcher',         winget: 'Balena.Etcher',                        github: 'balena-io/etcher' },
  { id: 'stats',           name: 'Stats',                 category: 'Utilities',     icon: '📊', desc: 'macOS system monitor in the menu bar',              platforms: ['mac'],       brew: 'stats',                winget: null },
  { id: 'cleanmymac',      name: 'CleanMyMac X',          category: 'Utilities',     icon: '✨', desc: 'Mac optimization and cleaning tool by MacPaw',      platforms: ['mac'],       brew: 'cleanmymac',           winget: null },
  { id: 'powertoys',       name: 'PowerToys',             category: 'Utilities',     icon: '⚡', desc: 'Windows system utilities by Microsoft',             platforms: ['win'],       brew: null,                   winget: 'Microsoft.PowerToys',                  github: 'microsoft/PowerToys' },
  { id: 'autohotkey',      name: 'AutoHotkey',            category: 'Utilities',     icon: '⌨️', desc: 'Windows automation scripting language',             platforms: ['win'],       brew: null,                   winget: 'AutoHotkey.AutoHotkey',                github: 'AutoHotkey/AutoHotkey' },
  { id: 'everything',      name: 'Everything',            category: 'Utilities',     icon: '🔍', desc: 'Instant file search by filename for Windows',       platforms: ['win'],       brew: null,                   winget: 'voidtools.Everything' },
  { id: 'utm',             name: 'UTM',                   category: 'Utilities',     icon: '🖥️', desc: 'Virtual machine host for macOS',                    platforms: ['mac'],       brew: 'utm',                  winget: null },
  { id: 'virtualbox',      name: 'VirtualBox',            category: 'Utilities',     icon: '📦', desc: 'Open-source virtualization platform',               platforms: ['mac','win'], brew: 'virtualbox',           winget: 'Oracle.VirtualBox' },
  { id: 'bartender',       name: 'Bartender',             category: 'Utilities',     icon: '🍹', desc: 'Menu bar item organizer for macOS',                 platforms: ['mac'],       brew: 'bartender',            winget: null },

  // ── Gaming ───────────────────────────────────────────────────────────────────
  { id: 'steam',           name: 'Steam',                 category: 'Gaming',        icon: '🎮', desc: 'Gaming platform by Valve',                          platforms: ['mac','win'], brew: 'steam',                winget: 'Valve.Steam' },
  { id: 'epic-games',      name: 'Epic Games Launcher',   category: 'Gaming',        icon: '🎯', desc: 'Gaming platform by Epic Games',                     platforms: ['mac','win'], brew: 'epic-games',           winget: 'EpicGames.EpicGamesLauncher' },
  { id: 'gog-galaxy',      name: 'GOG Galaxy',            category: 'Gaming',        icon: '🌌', desc: 'Gaming platform with DRM-free games',               platforms: ['win'],       brew: null,                   winget: 'GOG.Galaxy' },
  { id: 'battle-net',      name: 'Battle.net',            category: 'Gaming',        icon: '⚔️', desc: 'Blizzard game launcher and store',                  platforms: ['mac','win'], brew: 'battle-net',           winget: 'Blizzard.BattleNet' },
];

const CATALOG_CATEGORIES = [...new Set(CATALOG.map(a => a.category))].sort();

function getCatalogApp(id) {
  return CATALOG.find(a => a.id === id) || null;
}

function filterCatalog({ query = '', platform = 'all', category = 'all' } = {}) {
  const q = query.toLowerCase().trim();
  return CATALOG.filter(app => {
    if (platform !== 'all' && !app.platforms.includes(platform)) return false;
    if (category !== 'all' && app.category !== category) return false;
    if (q && !app.name.toLowerCase().includes(q) && !app.desc.toLowerCase().includes(q) && !app.category.toLowerCase().includes(q)) return false;
    return true;
  });
}
