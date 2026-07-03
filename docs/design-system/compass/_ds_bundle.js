/* @ds-bundle: {"format":3,"namespace":"CompassDesignSystemTransPerfect_019e2d","components":[],"sourceHashes":{"ui_kits/globallink/DashboardPage.jsx":"5890ec1bf45c","ui_kits/globallink/Header.jsx":"12069d69d9e6","ui_kits/globallink/Modals.jsx":"85d4fec1534c","ui_kits/globallink/Primitives.jsx":"6368f8aaa073","ui_kits/globallink/ProjectsPage.jsx":"e3e74af4a5ce","ui_kits/globallink/SideMenu.jsx":"ae0fc6c11d2a","ui_kits/globallink/WorkspacePage.jsx":"c5382590affd"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CompassDesignSystemTransPerfect_019e2d = window.CompassDesignSystemTransPerfect_019e2d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/globallink/DashboardPage.jsx
try { (() => {
/* GlobalLink UI Kit · Dashboard page */
const Sparkline = ({
  data,
  color = 'var(--gl-blue-500)'
}) => {
  const w = 200,
    h = 36;
  const max = Math.max(...data),
    min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${i / (data.length - 1) * w},${h - (v - min) / range * (h - 4) - 2}`).join(' ');
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${h}`,
    preserveAspectRatio: "none",
    style: {
      width: '100%',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: pts,
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinejoin: "round",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: `0,${h} ${pts} ${w},${h}`,
    fill: color,
    fillOpacity: "0.10",
    stroke: "none"
  }));
};
const StatTile = ({
  label,
  value,
  delta,
  deltaKind,
  sparkData,
  sparkColor
}) => /*#__PURE__*/React.createElement("div", {
  className: "stat"
}, /*#__PURE__*/React.createElement("div", {
  className: "label"
}, label), /*#__PURE__*/React.createElement("div", {
  className: "value"
}, value), delta && /*#__PURE__*/React.createElement("div", {
  className: `delta ${deltaKind}`
}, deltaKind === 'up' ? '↑' : '↓', " ", delta), sparkData && /*#__PURE__*/React.createElement("div", {
  className: "spark"
}, /*#__PURE__*/React.createElement(Sparkline, {
  data: sparkData,
  color: sparkColor
})));
const ActivityRow = ({
  initials,
  color,
  name,
  action,
  target,
  when
}) => /*#__PURE__*/React.createElement("div", {
  className: "row"
}, /*#__PURE__*/React.createElement(Avatar, {
  initials: initials,
  color: color
}), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    font: '400 13px/1.4 var(--gl-font-body)'
  }
}, /*#__PURE__*/React.createElement("strong", {
  style: {
    fontWeight: 600
  }
}, name), " ", action, " ", /*#__PURE__*/React.createElement("strong", {
  style: {
    fontWeight: 600
  }
}, target)), /*#__PURE__*/React.createElement("div", {
  style: {
    font: '400 11px/1.4 var(--gl-font-body)',
    color: 'var(--gl-fg-muted)'
  }
}, when)));
const LanguageRow = ({
  flag,
  name,
  words,
  pct,
  kind = ''
}) => /*#__PURE__*/React.createElement("div", {
  className: "row",
  style: {
    display: 'grid',
    gridTemplateColumns: '32px 1fr 88px 90px',
    alignItems: 'center',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    font: '500 18px/1 sans-serif'
  }
}, flag), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    font: '600 13px/1.3 var(--gl-font-body)'
  }
}, name), /*#__PURE__*/React.createElement("div", {
  style: {
    font: '400 11px/1.3 var(--gl-font-body)',
    color: 'var(--gl-fg-muted)'
  }
}, words.toLocaleString(), " words")), /*#__PURE__*/React.createElement(Progress, {
  pct: pct,
  kind: kind
}), /*#__PURE__*/React.createElement("div", {
  style: {
    font: '600 12px/1 var(--gl-font-body)',
    textAlign: 'right',
    color: 'var(--gl-fg-muted)'
  }
}, pct, "%"));
const DashboardPage = ({
  onOpenProject
}) => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
  className: "page-head"
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
  className: "crumb"
}, "Workspace \xB7 TransPerfect TechOps"), /*#__PURE__*/React.createElement("h1", null, "Good morning, Angela"), /*#__PURE__*/React.createElement("div", {
  className: "sub"
}, "3 projects are awaiting your review.")), /*#__PURE__*/React.createElement("div", {
  className: "actions"
}, /*#__PURE__*/React.createElement(Button, {
  kind: "secondary",
  icon: "download"
}, "Export"), /*#__PURE__*/React.createElement(Button, {
  kind: "primary",
  icon: "add",
  onClick: onOpenProject
}, "New project"))), /*#__PURE__*/React.createElement("div", {
  className: "stat-grid"
}, /*#__PURE__*/React.createElement(StatTile, {
  label: "Active projects",
  value: "42",
  delta: "+4 this week",
  deltaKind: "up",
  sparkData: [20, 22, 21, 28, 30, 29, 35, 38, 42]
}), /*#__PURE__*/React.createElement(StatTile, {
  label: "Words this week",
  value: "184,902",
  delta: "+12.4%",
  deltaKind: "up",
  sparkData: [120, 135, 128, 150, 160, 158, 172, 180, 184],
  sparkColor: "var(--gl-success-500)"
}), /*#__PURE__*/React.createElement(StatTile, {
  label: "Awaiting review",
  value: "3",
  delta: "\u22122 vs Mon",
  deltaKind: "down",
  sparkData: [7, 6, 5, 5, 4, 4, 3, 3, 3],
  sparkColor: "var(--gl-warning-500)"
}), /*#__PURE__*/React.createElement(StatTile, {
  label: "Avg turnaround",
  value: "2.4 d",
  delta: "\u22120.3 d",
  deltaKind: "up",
  sparkData: [3.1, 3.0, 2.8, 2.9, 2.7, 2.6, 2.5, 2.4, 2.4],
  sparkColor: "var(--gl-purple-500)"
})), /*#__PURE__*/React.createElement("div", {
  className: "two-col"
}, /*#__PURE__*/React.createElement("div", {
  className: "panel"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
}, /*#__PURE__*/React.createElement("h3", null, "Active locales"), /*#__PURE__*/React.createElement("span", {
  style: {
    font: '400 12px/1 var(--gl-font-body)',
    color: 'var(--gl-fg-muted)'
  }
}, "Q4 \xB7 all programs")), /*#__PURE__*/React.createElement(LanguageRow, {
  flag: "\uD83C\uDDEA\uD83C\uDDF8",
  name: "Spanish (es-ES)",
  words: 48201,
  pct: 92,
  kind: "success"
}), /*#__PURE__*/React.createElement(LanguageRow, {
  flag: "\uD83C\uDDEB\uD83C\uDDF7",
  name: "French (fr-FR)",
  words: 41003,
  pct: 78
}), /*#__PURE__*/React.createElement(LanguageRow, {
  flag: "\uD83C\uDDE9\uD83C\uDDEA",
  name: "German (de-DE)",
  words: 37502,
  pct: 64
}), /*#__PURE__*/React.createElement(LanguageRow, {
  flag: "\uD83C\uDDEF\uD83C\uDDF5",
  name: "Japanese (ja-JP)",
  words: 28114,
  pct: 41,
  kind: "warn"
}), /*#__PURE__*/React.createElement(LanguageRow, {
  flag: "\uD83C\uDDF0\uD83C\uDDF7",
  name: "Korean (ko-KR)",
  words: 22408,
  pct: 28,
  kind: "warn"
}), /*#__PURE__*/React.createElement(LanguageRow, {
  flag: "\uD83C\uDDE8\uD83C\uDDF3",
  name: "Chinese (zh-CN)",
  words: 18807,
  pct: 12,
  kind: "warn"
})), /*#__PURE__*/React.createElement("div", {
  className: "panel"
}, /*#__PURE__*/React.createElement("h3", null, "Recent activity"), /*#__PURE__*/React.createElement(ActivityRow, {
  initials: "MR",
  color: "var(--gl-blue-500)",
  name: "Mar\xEDa R.",
  action: "delivered",
  target: "Acme Q4 \xB7 es-ES",
  when: "2 minutes ago"
}), /*#__PURE__*/React.createElement(ActivityRow, {
  initials: "JK",
  color: "var(--gl-purple-500)",
  name: "Jin K.",
  action: "reviewed",
  target: "Aesop launch \xB7 ko-KR",
  when: "14 minutes ago"
}), /*#__PURE__*/React.createElement(ActivityRow, {
  initials: "LB",
  color: "var(--gl-pink-500)",
  name: "Luca B.",
  action: "assigned",
  target: "Patents 2025 \xB7 de-DE",
  when: "1 hour ago"
}), /*#__PURE__*/React.createElement(ActivityRow, {
  initials: "TP",
  color: "var(--gl-greenish-500)",
  name: "System",
  action: "auto-translated",
  target: "Help center \xB7 4 locales",
  when: "3 hours ago"
}), /*#__PURE__*/React.createElement(ActivityRow, {
  initials: "AN",
  color: "var(--gl-orange-500)",
  name: "Anna N.",
  action: "commented on",
  target: "LIVE booking flow",
  when: "Yesterday"
}))));
Object.assign(window, {
  DashboardPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/globallink/DashboardPage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/globallink/Header.jsx
try { (() => {
/* GlobalLink UI Kit · Header bar (light mode) */
const Header = ({
  product = 'NOW',
  onCreate,
  onNotify,
  notifyCount = 3,
  user
}) => {
  return /*#__PURE__*/React.createElement("header", {
    className: "gl-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gl-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "gl-iconbtn",
    "aria-label": "People"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "groups"
  })), /*#__PURE__*/React.createElement("button", {
    className: "gl-iconbtn",
    "aria-label": "Language"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "language"
  })), /*#__PURE__*/React.createElement("button", {
    className: "gl-iconbtn",
    "aria-label": "Toggle theme"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "light_mode"
  })), /*#__PURE__*/React.createElement("button", {
    className: "gl-iconbtn",
    "aria-label": "Notifications",
    onClick: onNotify,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "notifications"
  }), notifyCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "dot"
  })), /*#__PURE__*/React.createElement("button", {
    className: "gl-iconbtn",
    "aria-label": "Help"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "help"
  })), /*#__PURE__*/React.createElement("button", {
    className: "gl-iconbtn",
    "aria-label": "Apps"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "apps"
  })), /*#__PURE__*/React.createElement("div", {
    className: "gl-avatar",
    title: user?.name
  }, /*#__PURE__*/React.createElement("span", {
    className: "initial"
  }, (user?.initials || 'J').charAt(0)))));
};
const LogoCell = ({
  product = 'NOW'
}) => {
  const src = {
    NOW: './gl-now-full.svg'
  }[product] || './globallink-wordmark-blue.svg';
  return /*#__PURE__*/React.createElement("div", {
    className: "gl-logo-cell"
  }, /*#__PURE__*/React.createElement("img", {
    className: "wordmark",
    src: src,
    alt: `GlobalLink ${product}`
  }));
};
Object.assign(window, {
  Header,
  LogoCell
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/globallink/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/globallink/Modals.jsx
try { (() => {
/* GlobalLink UI Kit · Modals & toasts */

const NewProjectModal = ({
  open,
  onClose,
  onCreate
}) => {
  const [name, setName] = React.useState('Acme Q4 — global launch');
  const [source, setSource] = React.useState('en-US');
  const [targets, setTargets] = React.useState(['es-ES', 'fr-FR', 'de-DE']);
  if (!open) return null;
  const toggle = l => setTargets(t => t.includes(l) ? t.filter(x => x !== l) : [...t, l]);
  const langs = ['es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'];
  return /*#__PURE__*/React.createElement("div", {
    className: "scrim",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h3", null, "Create new project"), /*#__PURE__*/React.createElement("p", null, "Set up a new translation project. You can change locales and reviewers after creation."), /*#__PURE__*/React.createElement("button", {
    className: "x",
    onClick: onClose,
    "aria-label": "close"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    style: {
      fontSize: 18
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Project name"), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Source language"), /*#__PURE__*/React.createElement("select", {
    value: source,
    onChange: e => setSource(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "en-US"
  }, "English (United States) \u2014 en-US"), /*#__PURE__*/React.createElement("option", {
    value: "en-GB"
  }, "English (United Kingdom) \u2014 en-GB"), /*#__PURE__*/React.createElement("option", {
    value: "es-ES"
  }, "Spanish (Spain) \u2014 es-ES"))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Target languages"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, langs.map(l => /*#__PURE__*/React.createElement(Chip, {
    key: l,
    active: targets.includes(l),
    onClick: () => toggle(l)
  }, l))))), /*#__PURE__*/React.createElement("div", {
    className: "foot"
  }, /*#__PURE__*/React.createElement(Button, {
    kind: "ghost",
    onClick: onClose
  }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
    kind: "primary",
    onClick: () => onCreate({
      name,
      source,
      targets
    })
  }, "Create project"))));
};
const ToastStack = ({
  toasts
}) => /*#__PURE__*/React.createElement("div", {
  className: "toast-stack"
}, toasts.map(t => /*#__PURE__*/React.createElement("div", {
  key: t.id,
  className: `toast ${t.kind || 'info'}`
}, /*#__PURE__*/React.createElement("span", {
  className: "ico"
}, /*#__PURE__*/React.createElement(Icon, {
  name: t.kind === 'success' ? 'check' : 'info',
  style: {
    fontSize: 14,
    color: 'white'
  }
})), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "title"
}, t.title), t.desc && /*#__PURE__*/React.createElement("div", {
  className: "desc"
}, t.desc)))));
Object.assign(window, {
  NewProjectModal,
  ToastStack
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/globallink/Modals.jsx", error: String((e && e.message) || e) }); }

// ui_kits/globallink/Primitives.jsx
try { (() => {
/* GlobalLink UI Kit · shared icon component */
const Icon = ({
  name,
  style,
  filled
}) => /*#__PURE__*/React.createElement("span", {
  className: filled ? "material-icons" : "material-icons-outlined",
  style: {
    fontSize: 22,
    ...(style || {})
  }
}, name);
const Avatar = ({
  initials,
  color = 'var(--gl-blue-500)',
  size = 28
}) => /*#__PURE__*/React.createElement("span", {
  className: "avatar",
  style: {
    width: size,
    height: size,
    borderRadius: 100,
    color: 'white',
    background: color,
    display: 'grid',
    placeItems: 'center',
    font: `600 ${Math.round(size * 0.4)}px/1 var(--gl-font-body)`
  }
}, initials);
const Badge = ({
  kind = 'neutral',
  children
}) => /*#__PURE__*/React.createElement("span", {
  className: `badge ${kind}`
}, /*#__PURE__*/React.createElement("span", {
  className: "dot"
}), children);
const Button = ({
  kind = 'primary',
  size = 'md',
  icon,
  children,
  onClick,
  type = 'button'
}) => {
  const sizeStyle = size === 'sm' ? {
    height: 30,
    padding: '0 10px',
    fontSize: 12
  } : size === 'lg' ? {
    height: 44,
    padding: '0 18px',
    fontSize: 14
  } : {};
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    className: `btn btn-${kind}${!children ? ' btn-icon' : ''}`,
    style: sizeStyle,
    onClick: onClick
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon
  }), children);
};
const Chip = ({
  active,
  children,
  onClick
}) => /*#__PURE__*/React.createElement("span", {
  className: `chip${active ? ' active' : ''}`,
  onClick: onClick
}, children);
const Progress = ({
  pct,
  kind
}) => /*#__PURE__*/React.createElement("div", {
  className: `progress${kind ? ' ' + kind : ''}`
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: `${Math.max(0, Math.min(100, pct))}%`
  }
}));
Object.assign(window, {
  Icon,
  Avatar,
  Badge,
  Button,
  Chip,
  Progress
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/globallink/Primitives.jsx", error: String((e && e.message) || e) }); }

// ui_kits/globallink/ProjectsPage.jsx
try { (() => {
/* GlobalLink UI Kit · Projects list page */
const ProjectsPage = ({
  projects,
  onOpen,
  filter,
  onFilter,
  onNew
}) => {
  const filtered = projects.filter(p => filter === 'all' || p.status === filter);
  const statusBadge = s => {
    if (s === 'in-progress') return /*#__PURE__*/React.createElement(Badge, {
      kind: "info"
    }, "In progress");
    if (s === 'review') return /*#__PURE__*/React.createElement(Badge, {
      kind: "warn"
    }, "Awaiting review");
    if (s === 'delivered') return /*#__PURE__*/React.createElement(Badge, {
      kind: "success"
    }, "Delivered");
    if (s === 'draft') return /*#__PURE__*/React.createElement(Badge, {
      kind: "neutral"
    }, "Draft");
    return null;
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "crumb"
  }, "Workspace"), /*#__PURE__*/React.createElement("h1", null, "Projects"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, filtered.length, " of ", projects.length, " projects")), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, /*#__PURE__*/React.createElement(Button, {
    kind: "secondary",
    icon: "filter_list"
  }, "Filters"), /*#__PURE__*/React.createElement(Button, {
    kind: "secondary",
    icon: "download"
  }, "Export CSV"), /*#__PURE__*/React.createElement(Button, {
    kind: "primary",
    icon: "add",
    onClick: onNew
  }, "New project"))), /*#__PURE__*/React.createElement("div", {
    className: "gl-table"
  }, /*#__PURE__*/React.createElement("div", {
    className: "toolbar"
  }, /*#__PURE__*/React.createElement("h3", null, "All projects"), /*#__PURE__*/React.createElement("div", {
    className: "filters"
  }, /*#__PURE__*/React.createElement(Chip, {
    active: filter === 'all',
    onClick: () => onFilter('all')
  }, "All"), /*#__PURE__*/React.createElement(Chip, {
    active: filter === 'in-progress',
    onClick: () => onFilter('in-progress')
  }, "In progress"), /*#__PURE__*/React.createElement(Chip, {
    active: filter === 'review',
    onClick: () => onFilter('review')
  }, "Awaiting review"), /*#__PURE__*/React.createElement(Chip, {
    active: filter === 'delivered',
    onClick: () => onFilter('delivered')
  }, "Delivered"), /*#__PURE__*/React.createElement(Chip, {
    active: filter === 'draft',
    onClick: () => onFilter('draft')
  }, "Draft")), /*#__PURE__*/React.createElement("div", {
    className: "right"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 240
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms",
    style: {
      position: 'absolute',
      left: 8,
      top: 8,
      fontSize: 16,
      color: 'var(--gl-fg-subtle)'
    }
  }, "search"), /*#__PURE__*/React.createElement("input", {
    placeholder: "Search projects",
    style: {
      width: '100%',
      height: 32,
      border: '1px solid var(--gl-border)',
      borderRadius: 6,
      padding: '0 10px 0 30px',
      font: '400 13px/1 var(--gl-font-body)',
      outline: 'none'
    }
  })))), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      width: 32
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox"
  })), /*#__PURE__*/React.createElement("th", null, "Project"), /*#__PURE__*/React.createElement("th", null, "Languages"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null, "Progress"), /*#__PURE__*/React.createElement("th", null, "Due"), /*#__PURE__*/React.createElement("th", null, "Owner"), /*#__PURE__*/React.createElement("th", {
    style: {
      width: 40
    }
  }))), /*#__PURE__*/React.createElement("tbody", null, filtered.map(p => /*#__PURE__*/React.createElement("tr", {
    key: p.id,
    onClick: () => onOpen(p),
    style: {
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    onClick: e => e.stopPropagation()
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, p.client, " \xB7 ", p.words.toLocaleString(), " words")), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4
    }
  }, p.languages.slice(0, 3).map(l => /*#__PURE__*/React.createElement("span", {
    key: l,
    className: "lang"
  }, l)), p.languages.length > 3 && /*#__PURE__*/React.createElement("span", {
    className: "lang",
    style: {
      background: 'transparent',
      color: 'var(--gl-fg-muted)'
    }
  }, "+", p.languages.length - 3))), /*#__PURE__*/React.createElement("td", null, statusBadge(p.status)), /*#__PURE__*/React.createElement("td", {
    style: {
      width: 160
    }
  }, /*#__PURE__*/React.createElement(Progress, {
    pct: p.progress,
    kind: p.progress < 35 ? 'warn' : p.progress >= 90 ? 'success' : ''
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '400 11px/1.4 var(--gl-font-body)',
      color: 'var(--gl-fg-muted)',
      marginTop: 4
    }
  }, p.progress, "%")), /*#__PURE__*/React.createElement("td", null, p.due), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    initials: p.owner.initials,
    color: p.owner.color,
    size: 24
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gl-fg-muted)'
    }
  }, p.owner.name))), /*#__PURE__*/React.createElement("td", {
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "more_horiz"
  })))))))));
};
Object.assign(window, {
  ProjectsPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/globallink/ProjectsPage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/globallink/SideMenu.jsx
try { (() => {
/* GlobalLink UI Kit · Side menu */
const SideMenu = ({
  active,
  onNavigate,
  counts = {}
}) => {
  const items = [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard'
  }, {
    id: 'projects',
    label: 'Projects',
    icon: 'folder',
    count: counts.projects
  }, {
    id: 'workspace',
    label: 'Workspace',
    icon: 'translate'
  }, {
    id: 'files',
    label: 'Files',
    icon: 'description'
  }, {
    id: 'team',
    label: 'Team',
    icon: 'groups'
  }];
  const admin = [{
    id: 'reports',
    label: 'Reports',
    icon: 'analytics'
  }, {
    id: 'invoices',
    label: 'Invoices',
    icon: 'receipt_long',
    count: counts.invoices
  }, {
    id: 'settings',
    label: 'Settings',
    icon: 'settings'
  }];
  const Item = ({
    it
  }) => /*#__PURE__*/React.createElement("div", {
    className: `item${active === it.id ? ' active' : ''}`,
    onClick: () => onNavigate(it.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.icon
  }), /*#__PURE__*/React.createElement("span", null, it.label), it.count != null && /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, it.count));
  return /*#__PURE__*/React.createElement("nav", {
    className: "gl-side"
  }, items.map(it => /*#__PURE__*/React.createElement(Item, {
    key: it.id,
    it: it
  })), /*#__PURE__*/React.createElement("div", {
    className: "group"
  }, "Admin"), admin.map(it => /*#__PURE__*/React.createElement(Item, {
    key: it.id,
    it: it
  })));
};
Object.assign(window, {
  SideMenu
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/globallink/SideMenu.jsx", error: String((e && e.message) || e) }); }

// ui_kits/globallink/WorkspacePage.jsx
try { (() => {
/* GlobalLink UI Kit · Translation workspace */
const WorkspacePage = ({
  project,
  onBack
}) => {
  const [segments, setSegments] = React.useState([{
    id: 1,
    status: 'translated',
    src: "Welcome to GlobalLink — let's set up your first project.",
    tgt: "Te damos la bienvenida a GlobalLink: vamos a configurar tu primer proyecto."
  }, {
    id: 2,
    status: 'in-review',
    src: 'Choose a source language and the locales you want to translate into.',
    tgt: 'Elige un idioma de origen y los idiomas a los que quieres traducir.'
  }, {
    id: 3,
    status: 'translated',
    src: 'Drag and drop files here, or browse to upload.',
    tgt: 'Arrastra y suelta los archivos aquí, o haz clic para subirlos.'
  }, {
    id: 4,
    status: 'machine',
    src: 'You can invite reviewers later — no decision needed now.',
    tgt: 'Puedes invitar a revisores más tarde: no es necesario decidirlo ahora.'
  }, {
    id: 5,
    status: 'empty',
    src: 'Project settings can be edited from the gear menu at any time.',
    tgt: ''
  }]);
  const updateSeg = (i, val) => setSegments(s => s.map((x, idx) => idx === i ? {
    ...x,
    tgt: val,
    status: 'translated'
  } : x));
  const statusBadge = s => s === 'translated' ? /*#__PURE__*/React.createElement(Badge, {
    kind: "success"
  }, "Translated") : s === 'in-review' ? /*#__PURE__*/React.createElement(Badge, {
    kind: "warn"
  }, "In review") : s === 'machine' ? /*#__PURE__*/React.createElement(Badge, {
    kind: "purple"
  }, "MT") : /*#__PURE__*/React.createElement(Badge, {
    kind: "neutral"
  }, "Empty");
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "crumb",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer'
    },
    onClick: onBack
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow_back",
    style: {
      fontSize: 14
    }
  }), " Projects"), /*#__PURE__*/React.createElement("h1", null, project.name), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, project.client, " \xB7 ", project.languages.join(' · '), " \xB7 ", project.words.toLocaleString(), " words")), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, /*#__PURE__*/React.createElement(Button, {
    kind: "ghost",
    icon: "comment"
  }, "Comments"), /*#__PURE__*/React.createElement(Button, {
    kind: "secondary",
    icon: "visibility"
  }, "Preview"), /*#__PURE__*/React.createElement(Button, {
    kind: "primary",
    icon: "check"
  }, "Submit for review"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--gl-divider)',
      marginBottom: 16
    }
  }, project.languages.map((l, i) => /*#__PURE__*/React.createElement("button", {
    key: l,
    className: "btn btn-ghost",
    style: {
      borderRadius: 0,
      height: 36,
      padding: '0 14px',
      color: i === 0 ? 'var(--gl-blue-500)' : 'var(--gl-fg-muted)',
      background: 'transparent',
      borderBottom: i === 0 ? '2px solid var(--gl-blue-500)' : '2px solid transparent',
      fontWeight: i === 0 ? 600 : 500
    }
  }, l)), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      borderRadius: 0,
      height: 36,
      padding: '0 10px',
      borderBottom: '2px solid transparent',
      color: 'var(--gl-fg-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "add",
    style: {
      fontSize: 16
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "editor"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      background: 'var(--gl-gray-50)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "num",
    style: {
      font: '600 11px/1 var(--gl-font-body)',
      textTransform: 'uppercase',
      letterSpacing: '.06em',
      color: 'var(--gl-fg-muted)'
    }
  }, "#"), /*#__PURE__*/React.createElement("div", {
    className: "src",
    style: {
      font: '600 11px/1 var(--gl-font-body)',
      textTransform: 'uppercase',
      letterSpacing: '.06em',
      color: 'var(--gl-fg-muted)'
    }
  }, "Source \xB7 English (en-US)"), /*#__PURE__*/React.createElement("div", {
    className: "tgt",
    style: {
      font: '600 11px/1 var(--gl-font-body)',
      textTransform: 'uppercase',
      letterSpacing: '.06em',
      color: 'var(--gl-fg-muted)'
    }
  }, "Target \xB7 Spanish (es-ES)"), /*#__PURE__*/React.createElement("div", {
    className: "status",
    style: {
      font: '600 11px/1 var(--gl-font-body)',
      textTransform: 'uppercase',
      letterSpacing: '.06em',
      color: 'var(--gl-fg-muted)'
    }
  }, "Status")), segments.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: s.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, String(s.id).padStart(3, '0')), /*#__PURE__*/React.createElement("div", {
    className: "src"
  }, s.src), /*#__PURE__*/React.createElement("div", {
    className: "tgt"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: s.tgt,
    onChange: e => updateSeg(i, e.target.value),
    placeholder: "Type translation\u2026"
  })), /*#__PURE__*/React.createElement("div", {
    className: "status"
  }, statusBadge(s.status))))));
};
Object.assign(window, {
  WorkspacePage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/globallink/WorkspacePage.jsx", error: String((e && e.message) || e) }); }

})();
