'use strict';

const { spawnSync } = require('child_process');
const blessed = require('blessed');

function fetchUsageData(command, args = []) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (result.error || result.status !== 0) {
    return null;
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    return null;
  }
}

function formatNumber(num) {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatCost(cost) {
  return `$${cost.toFixed(2)}`;
}

function normalizeDate(date) {
  // Handle both "2025-10-02" and "Oct 02, 2025" formats
  // Parse YYYY-MM-DD format to avoid timezone issues
  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }

  // Try parsing other formats
  const parsed = new Date(date);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }
  return date;
}

function buildTableContent(claudeData, codexData) {
  const lines = [];
  const rows = [];

  // Collect all dates and combine data from both sources
  const dateMap = new Map();

  if (claudeData && claudeData.daily) {
    claudeData.daily.forEach(day => {
      const normalizedDate = normalizeDate(day.date);
      if (!dateMap.has(normalizedDate)) {
        dateMap.set(normalizedDate, []);
      }
      dateMap.get(normalizedDate).push({
        source: 'Claude',
        data: day,
        color: 'cyan-fg'
      });
    });
  }

  if (codexData && codexData.daily) {
    codexData.daily.forEach(day => {
      const normalizedDate = normalizeDate(day.date);
      if (!dateMap.has(normalizedDate)) {
        dateMap.set(normalizedDate, []);
      }
      dateMap.get(normalizedDate).push({
        source: 'Codex',
        data: day,
        color: 'magenta-fg'
      });
    });
  }

  // Sort dates and create rows with separate lines per model
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => {
    return new Date(a) - new Date(b);
  });

  sortedDates.forEach(date => {
    const entries = dateMap.get(date);
    let isFirstInDate = true;

    entries.forEach(entry => {
      const { source, data, color } = entry;
      let models = [];

      if (source === 'Claude') {
        models = (data.modelsUsed || []).map(m => {
          // Shorten long model names
          if (m.includes('claude-sonnet-4-5')) return 'sonnet-4.5';
          if (m.includes('claude-sonnet-4')) return 'sonnet-4';
          if (m.includes('claude-sonnet-3-5')) return 'sonnet-3.5';
          if (m.includes('claude-opus')) return 'opus';
          return m;
        });
      } else if (source === 'Codex') {
        models = Object.keys(data.models || {}).map(m => {
          // Shorten model names
          if (m.includes('gpt-5-codex')) return 'gpt-5-codex';
          if (m.includes('gpt-5')) return 'gpt-5';
          if (m.includes('gpt-4')) return 'gpt-4';
          return m;
        });
      }

      // If no models, still show one row
      if (models.length === 0) {
        models = [''];
      }

      // Add rows for each model
      models.forEach((model, modelIdx) => {
        rows.push({
          date: isFirstInDate ? date : '',
          source: modelIdx === 0 ? source : '',
          model: model,
          data: modelIdx === 0 ? data : null,
          sourceType: source,
          color: color,
          showData: modelIdx === 0
        });
        isFirstInDate = false;
      });
    });
  });

  // Column widths
  const DATE_W = 12;
  const SOURCE_W = 6;
  const MODEL_W = 18;
  const INPUT_W = 9;
  const OUTPUT_W = 9;
  const CREAD_W = 9;
  const CWRITE_W = 9;
  const COST_W = 9;

  // Header
  lines.push('┌──────────────┬────────┬────────────────────┬───────────┬───────────┬───────────┬───────────┬───────────┐');
  lines.push('│ {bold}Date{/bold}         │ {bold}Source{/bold} │ {bold}Model{/bold}              │ {bold}Input{/bold}     │ {bold}Output{/bold}    │ {bold}CacheRead{/bold} │ {bold}CacheWrit{/bold} │ {bold}Cost{/bold}      │');
  lines.push('├──────────────┼────────┼────────────────────┼───────────┼───────────┼───────────┼───────────┼───────────┤');

  // Data rows
  rows.forEach(row => {
    const { date, source, model, data, sourceType, color, showData } = row;

    let input = 0;
    let output = 0;
    let cacheRead = 0;
    let cacheWrite = 0;
    let cost = 0;

    if (showData && data) {
      if (sourceType === 'Claude') {
        input = data.inputTokens || 0;
        output = data.outputTokens || 0;
        cacheRead = data.cacheReadTokens || 0;
        cacheWrite = data.cacheCreationTokens || 0;
        cost = data.totalCost || 0;
      } else if (sourceType === 'Codex') {
        input = data.inputTokens || 0;
        output = data.outputTokens || 0;
        cacheRead = data.cachedInputTokens || 0;
        cacheWrite = 0;
        cost = data.costUSD || 0;
      }
    }

    // Truncate model name if too long
    let displayModel = model;
    if (displayModel.length > MODEL_W) {
      displayModel = displayModel.substring(0, MODEL_W - 3) + '...';
    }

    const datePart = date.padEnd(DATE_W);
    const sourcePart = source.padEnd(SOURCE_W);
    const modelPart = displayModel.padEnd(MODEL_W);
    const inputPart = showData ? formatNumber(input).padStart(INPUT_W) : ''.padStart(INPUT_W);
    const outputPart = showData ? formatNumber(output).padStart(OUTPUT_W) : ''.padStart(OUTPUT_W);
    const creadPart = showData ? formatNumber(cacheRead).padStart(CREAD_W) : ''.padStart(CREAD_W);
    const cwritePart = showData ? formatNumber(cacheWrite).padStart(CWRITE_W) : ''.padStart(CWRITE_W);
    const costPart = showData ? formatCost(cost).padStart(COST_W) : ''.padStart(COST_W);

    const sourceDisplay = source ? `{${color}}${sourcePart}{/${color}}` : sourcePart;
    const modelDisplay = model ? `{${color}}${modelPart}{/${color}}` : modelPart;

    const line = `│ ${datePart} │ ${sourceDisplay} │ ${modelDisplay} │ ${inputPart} │ ${outputPart} │ ${creadPart} │ ${cwritePart} │ ${costPart} │`;
    lines.push(line);
  });

  // Totals separator
  lines.push('├──────────────┼────────┼────────────────────┼───────────┼───────────┼───────────┼───────────┼───────────┤');

  // Totals rows
  if (claudeData && claudeData.totals) {
    const t = claudeData.totals;
    const datePart = 'TOTAL'.padEnd(DATE_W);
    const sourcePart = 'Claude'.padEnd(SOURCE_W);
    const modelsPart = ''.padEnd(MODEL_W);
    const inputPart = formatNumber(t.inputTokens || 0).padStart(INPUT_W);
    const outputPart = formatNumber(t.outputTokens || 0).padStart(OUTPUT_W);
    const creadPart = formatNumber(t.cacheReadTokens || 0).padStart(CREAD_W);
    const cwritePart = formatNumber(t.cacheCreationTokens || 0).padStart(CWRITE_W);
    const costPart = formatCost(t.totalCost || 0).padStart(COST_W);

    const line = `│ {yellow-fg}{bold}${datePart}{/bold}{/yellow-fg} │ {cyan-fg}{bold}${sourcePart}{/bold}{/cyan-fg} │ ${modelsPart} │ {bold}${inputPart}{/bold} │ {bold}${outputPart}{/bold} │ {bold}${creadPart}{/bold} │ {bold}${cwritePart}{/bold} │ {bold}${costPart}{/bold} │`;
    lines.push(line);
  }

  if (codexData && codexData.totals) {
    const t = codexData.totals;
    const datePart = (claudeData && claudeData.totals ? '' : 'TOTAL').padEnd(DATE_W);
    const sourcePart = 'Codex'.padEnd(SOURCE_W);
    const modelsPart = ''.padEnd(MODEL_W);
    const inputPart = formatNumber(t.inputTokens || 0).padStart(INPUT_W);
    const outputPart = formatNumber(t.outputTokens || 0).padStart(OUTPUT_W);
    const creadPart = formatNumber(t.cachedInputTokens || 0).padStart(CREAD_W);
    const cwritePart = formatNumber(0).padStart(CWRITE_W);
    const costPart = formatCost(t.costUSD || 0).padStart(COST_W);

    const dateTag = (claudeData && claudeData.totals) ? datePart : `{yellow-fg}{bold}${datePart}{/bold}{/yellow-fg}`;
    const line = `│ ${dateTag} │ {magenta-fg}{bold}${sourcePart}{/bold}{/magenta-fg} │ ${modelsPart} │ {bold}${inputPart}{/bold} │ {bold}${outputPart}{/bold} │ {bold}${creadPart}{/bold} │ {bold}${cwritePart}{/bold} │ {bold}${costPart}{/bold} │`;
    lines.push(line);
  }

  // Footer
  lines.push('└──────────────┴────────┴────────────────────┴───────────┴───────────┴───────────┴───────────┴───────────┘');

  return lines.join('\n');
}

function runUsageWatch(options = {}) {
  const interval = options.interval || 60;
  const since = options.since || null;

  // Create screen
  const screen = blessed.screen({
    smartCSR: true,
    title: 'AI Usage Monitor'
  });

  // Header box
  const header = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: '',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'blue'
      }
    }
  });

  // Main content box
  const content = blessed.box({
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-3',
    content: 'Loading...',
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray'
      },
      style: {
        inverse: true
      }
    },
    keys: true,
    vi: true,
    mouse: true
  });

  screen.append(header);
  screen.append(content);

  // Quit handler
  screen.key(['escape', 'q', 'C-c'], () => {
    return process.exit(0);
  });

  // Scroll handlers
  screen.key(['up', 'k'], () => {
    content.scroll(-1);
    screen.render();
  });

  screen.key(['down', 'j'], () => {
    content.scroll(1);
    screen.render();
  });

  screen.key(['pageup'], () => {
    content.scroll(-content.height || -10);
    screen.render();
  });

  screen.key(['pagedown'], () => {
    content.scroll(content.height || 10);
    screen.render();
  });

  function updateDisplay() {
    const now = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    header.setContent(
      `{bold}AI Usage Monitor{/bold}\n` +
      `Last Update: ${now}  │  Refreshing every ${interval}s  │  Press {bold}q{/bold} to quit, {bold}↑↓{/bold} to scroll  │  Hold {bold}Option/Alt{/bold} to select text`
    );

    const claudeArgs = ['daily', '--json'];
    const codexArgs = ['daily', '--json'];

    if (since) {
      claudeArgs.push('--since', since);
      codexArgs.push('--since', since);
    }

    const claudeData = fetchUsageData('ccusage', claudeArgs);
    const codexData = fetchUsageData('ccusage-codex', codexArgs);

    if (!claudeData && !codexData) {
      content.setContent('{red-fg}Error: Unable to fetch usage data from ccusage or ccusage-codex{/red-fg}');
    } else if (!claudeData) {
      content.setContent('{yellow-fg}Warning: Unable to fetch Claude usage data{/yellow-fg}\n\n' +
                        buildTableContent(null, codexData));
    } else if (!codexData) {
      content.setContent('{yellow-fg}Warning: Unable to fetch Codex usage data{/yellow-fg}\n\n' +
                        buildTableContent(claudeData, null));
    } else {
      content.setContent(buildTableContent(claudeData, codexData));
    }

    screen.render();
  }

  // Initial update
  updateDisplay();

  // Set up interval
  setInterval(updateDisplay, interval * 1000);

  // Render the screen
  screen.render();
}

module.exports = {
  runUsageWatch
};
