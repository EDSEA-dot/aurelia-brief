import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function safe(val) {
  if (!val || val === "—") return "—";
  return String(val).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function kv(pairs) {
  const rows = pairs.filter(([, v]) => v && v !== "—");
  if (!rows.length) return '<p style="color:#7A6952;font-size:12px;font-style:italic;">No data.</p>';
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;">
    ${rows.map(([k, v]) => `
      <tr>
        <td style="padding:7px 0;border-bottom:1px solid #F2EBE0;color:#7A6952;width:55%;">${safe(k)}</td>
        <td style="padding:7px 0;border-bottom:1px solid #F2EBE0;font-weight:500;text-align:right;">${safe(v)}</td>
      </tr>`).join("")}
  </table>`;
}

function table(headers, rows, rowClass) {
  if (!rows || !rows.length) return '<p style="color:#7A6952;font-size:12px;font-style:italic;">No entries.</p>';
  return `<table style="width:100%;border-collapse:collapse;font-size:12.5px;">
    <thead><tr>${headers.map(h => `<th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr style="${rowClass ? rowClass(r) : ""}">${Object.values(r).map(v => `<td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${safe(v)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

function sectionHead(num, title, notion) {
  return `<div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid #DDD4C4;">
    <span style="background:#BA7517;color:#1C1208;font-size:11px;font-weight:500;padding:3px 9px;border-radius:4px;letter-spacing:.08em;">${num}</span>
    <span style="font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:400;color:#1C1208;">${title}</span>
    ${notion ? `<span style="background:#1a1a1a;color:#e0c882;font-size:10px;padding:2px 8px;border-radius:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:500;">Notion</span>` : ""}
  </div>`;
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send("<h1>Missing brief ID</h1>");

  let d;
  try {
    const raw = await redis.get(`brief:${id}`);
    if (!raw) return res.status(404).send(notFoundPage(id));
    d = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (err) {
    return res.status(500).send(`<h1>Error loading brief: ${err.message}</h1>`);
  }

  const riskRows = d.riskRows || [];
  const riskCount = riskRows.length;
  const notionPowered = d.notionPowered || false;
  const notionBadge = notionPowered ? `<span style="background:#1a1a1a;color:#e0c882;font-size:10px;padding:2px 8px;border-radius:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:500;display:inline-block;">Notion</span>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Aurelia Health — Daily Brief ${safe(d.date)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#FAF7F2;font-family:'DM Sans',sans-serif;color:#1C1208;font-size:14px;line-height:1.6;}
  @media print{.no-print{display:none!important;} body{background:white;}}
  @media(max-width:768px){
    .kpi-strip{grid-template-columns:1fr 1fr!important;}
    .grid-2{grid-template-columns:1fr!important;}
    .brief-body{padding:24px 20px!important;}
    .brief-header{padding:24px 20px!important;}
  }
</style>
</head>
<body>

<!-- Header -->
<div style="background:#1C1208;padding:36px 56px;display:flex;align-items:flex-end;justify-content:space-between;">
  <div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:#F0DEB0;letter-spacing:.04em;">Aurelia Health</div>
    <div style="font-size:12px;color:#8A7260;margin-top:4px;">Daily Executive Brief</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:13px;color:#F0DEB0;opacity:.8;">${safe(d.dateDisplay)}</div>
    <div style="font-size:11px;color:#7A6952;margin-top:3px;letter-spacing:.06em;text-transform:uppercase;">Prepared by ${safe(d.preparedBy) !== "—" ? safe(d.preparedBy) : "Aurelia Ops"}</div>
  </div>
</div>

<div class="brief-body" style="padding:40px 56px;max-width:1100px;margin:0 auto;">

  <!-- Print button -->
  <div class="no-print" style="display:flex;justify-content:flex-end;margin-bottom:28px;gap:10px;">
    <button onclick="window.print()" style="background:#BA7517;color:#1C1208;border:none;border-radius:24px;padding:10px 22px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;">⬇ Print / Save as PDF</button>
  </div>

  <!-- KPI Strip -->
  <div class="kpi-strip" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:40px;">
    <div style="background:white;border:1px solid #DDD4C4;border-radius:12px;padding:20px 22px;border-top:3px solid #BA7517;">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;margin-bottom:8px;">New Enrollments</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:400;line-height:1;">${safe(d.enrollToday)}</div>
      <div style="font-size:11px;color:#7A6952;margin-top:5px;">MTD: ${safe(d.enrollMtd)} &nbsp;|&nbsp; Goal: ${safe(d.enrollGoal)}</div>
    </div>
    <div style="background:white;border:1px solid #DDD4C4;border-radius:12px;padding:20px 22px;border-top:3px solid #BA7517;">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;margin-bottom:8px;">Active Members</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:400;line-height:1;">${safe(d.memTotal)}</div>
      <div style="font-size:11px;color:#7A6952;margin-top:5px;">Trial: ${safe(d.memTrial)} &nbsp;|&nbsp; Renewal: ${safe(d.memCont)}</div>
    </div>
    <div style="background:white;border:1px solid #DDD4C4;border-radius:12px;padding:20px 22px;border-top:3px solid ${riskCount > 0 ? "#C44444" : "#BA7517"};">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;margin-bottom:8px;">Off-Board Risk</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:400;line-height:1;color:${riskCount > 0 ? "#A32D2D" : "#1C1208"};">${riskCount}</div>
      <div style="font-size:11px;color:#7A6952;margin-top:5px;">${riskCount > 0 ? "Members flagged today" : "No flags today"}</div>
    </div>
    <div style="background:white;border:1px solid #DDD4C4;border-radius:12px;padding:20px 22px;border-top:3px solid #BA7517;">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;margin-bottom:8px;">Meta Spend (Today)</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:400;line-height:1;">${safe(d.metaSpendToday) !== "—" ? safe(d.metaSpendToday) : "$—"}</div>
      <div style="font-size:11px;color:#7A6952;margin-top:5px;">CPL: ${safe(d.metaCplToday)} &nbsp;|&nbsp; Leads: ${safe(d.metaLeadsToday)}</div>
    </div>
  </div>

  <!-- 01 Enrollment -->
  <div style="margin-bottom:36px;">
    ${sectionHead("01", "Enrollment Stats & Lead Source", false)}
    <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
        ${kv([["New Enrollments Today", d.enrollToday], ["MTD Enrollments", d.enrollMtd], ["YTD Enrollments", d.enrollYtd], ["Monthly Goal", d.enrollGoal]])}
      </div>
      <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
        ${(d.leadRows && d.leadRows.length) ? table(["Source","Leads","Converted","Rate"], d.leadRows) : '<p style="color:#7A6952;font-size:12px;font-style:italic;">No lead source data.</p>'}
      </div>
    </div>
    ${d.pasteEnrollment && d.pasteEnrollment !== "—" ? `<div style="background:#FAF0DC;border:1px solid #F0DEB0;border-radius:10px;padding:16px 20px;margin-top:12px;"><div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#BA7517;margin-bottom:6px;">Raw Notes</div><div style="font-size:13px;white-space:pre-wrap;">${safe(d.pasteEnrollment)}</div></div>` : ""}
  </div>

  <!-- 02 Membership -->
  <div style="margin-bottom:36px;">
    ${sectionHead("02", "Membership & Continuation Counts", notionPowered)}
    <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
      <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>${kv([["Active Members (Current Program)", d.memActive], ["Continuation / Renewal", d.memCont], ["Legacy (Old Program)", d.memLegacy], ["Trial / Provisional", d.memTrial], ["Total Active", d.memTotal]])}</div>
        ${notionPowered && d.notionCounts ? `<div>
          <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;margin-bottom:10px;">Stage Breakdown</div>
          ${kv([["Fully Onboarded", d.notionCounts.activeCurrent], ["In Continuation", d.notionCounts.inCont], ["Approaching Renewal", d.notionCounts.approachingCont], ["In Onboarding", d.notionCounts.trial], ["Care Completed", d.notionCounts.completedCare]])}
        </div>` : ""}
      </div>
    </div>
  </div>

  <!-- 03 Off-Boarding -->
  <div style="margin-bottom:36px;">
    ${sectionHead("03", "Off-Boarding Risk Flags", notionPowered)}
    <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
      ${riskRows.length ? `
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead><tr>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;border-radius:6px 0 0 0;">Member</th>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Flag / Reason</th>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;border-radius:0 6px 0 0;">Recommended Action</th>
        </tr></thead>
        <tbody>
          ${riskRows.map(r => {
            const isAlert = r.reason && r.reason.includes("⚠️");
            const isCont  = r.reason && r.reason.includes("Approaching");
            const bg = isAlert ? "background:#FCEBEB;" : isCont ? "background:#FFF8EC;" : "";
            const tagBg = isAlert ? "background:#FCEBEB;color:#8B2020;" : isCont ? "background:#FFF3DC;color:#6B4400;" : "background:#E8EDE2;color:#6B7A5E;";
            return `<tr style="${bg}">
              <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;"><span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;${tagBg}">${safe(r.name)}</span></td>
              <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${safe(r.reason)}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;font-size:12px;">${safe(r.action)}</td>
            </tr>`;
          }).join("")}
          <tr style="background:#FFF3DC;font-weight:500;">
            <td colspan="2" style="padding:8px 10px;font-size:12px;letter-spacing:.04em;">Total At-Risk</td>
            <td style="padding:8px 10px;"><strong>${riskCount}</strong> member${riskCount !== 1 ? "s" : ""}</td>
          </tr>
        </tbody>
      </table>` : '<p style="color:#7A6952;font-size:12px;font-style:italic;">No off-boarding risk flags today.</p>'}
      ${d.pasteRisk && d.pasteRisk !== "—" ? `<div style="margin-top:12px;padding:12px;background:#FCEBEB;border-radius:8px;font-size:12px;color:#6B2020;white-space:pre-wrap;">${safe(d.pasteRisk)}</div>` : ""}
    </div>
  </div>

  <!-- 04 Meta Ads -->
  <div style="margin-bottom:36px;">
    ${sectionHead("04", "Meta Ads Performance", false)}
    <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px;">
      <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
        <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;margin-bottom:10px;">Today</div>
        ${kv([["Spend", d.metaSpendToday], ["Impressions", d.metaImpToday], ["Link Clicks", d.metaClicksToday], ["CTR", d.metaCtrToday], ["CPL", d.metaCplToday], ["Leads", d.metaLeadsToday]])}
      </div>
      <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
        <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;margin-bottom:10px;">Last 7 Days</div>
        ${kv([["Spend", d.metaSpend7d], ["Impressions", d.metaImp7d], ["Link Clicks", d.metaClicks7d], ["CTR", d.metaCtr7d], ["CPL", d.metaCpl7d], ["Leads", d.metaLeads7d], ["ROAS", d.metaRoas7d]])}
      </div>
    </div>
    <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;margin-bottom:10px;">Top Performing Creative</div>
      ${kv([["Ad Name / ID", d.metaAdName], ["Format", d.metaAdFormat], ["CTR", d.metaAdCtr], ["CPL", d.metaAdCpl], ["Notes", d.metaAdNotes]])}
    </div>
  </div>

  <!-- 05 Workshop -->
  <div style="margin-bottom:36px;">
    ${sectionHead("05", "Workshop Sign-Ups", false)}
    <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
        ${kv([["Workshop", d.wsName], ["Platform", d.wsPlatform], ["Date & Time", d.wsDate], ["Capacity", d.wsCapacity], ["Total Registered", d.wsRegistered], ["New Today", d.wsNewToday], ["Waitlist", d.wsWaitlist]])}
      </div>
      <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
        <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#7A6952;margin-bottom:10px;">Registration Sources</div>
        ${(d.wsSourceRows && d.wsSourceRows.length) ? table(["Source","Count","% of Total"], d.wsSourceRows) : '<p style="color:#7A6952;font-size:12px;font-style:italic;">No source data.</p>'}
      </div>
    </div>
  </div>

  <!-- 06 Email -->
  <div style="margin-bottom:36px;">
    ${sectionHead("06", "ActiveCampaign Email Performance", false)}
    <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;margin-bottom:12px;">
      ${(d.emailRows && d.emailRows.length) ? table(["Campaign","Sent","Open Rate","Click Rate","Unsubs"], d.emailRows) : '<p style="color:#7A6952;font-size:12px;font-style:italic;">No campaigns entered.</p>'}
    </div>
    <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
      <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#7A6952;margin-bottom:10px;">Automation Notes</div>
      ${kv([["Active Sequences", d.acSequences], ["Total Unsubs MTD", d.acUnsubsMtd], ["Unsub Rate MTD", d.acUnsubRate], ["Notes", d.acNotes]])}
    </div>
  </div>

  <!-- 07 MiniChat -->
  <div style="margin-bottom:36px;">
    ${sectionHead("07", "MiniChat Updates", false)}
    <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
        ${kv([["New Conversations", d.mcConvos], ["Opt-Ins Added", d.mcOptins], ["Active Flows", d.mcFlows], ["Bot → Human Handoffs", d.mcHandoffs], ["Conversion Actions", d.mcConversions], ["Top Keyword Trigger", d.mcKeyword], ["Drop-Off Point", d.mcDropoff]])}
      </div>
      <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
        <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#7A6952;margin-bottom:10px;">Key Themes</div>
        <div style="font-size:13px;white-space:pre-wrap;">${safe(d.mcNotes)}</div>
      </div>
    </div>
  </div>

  <!-- 08 Inbox -->
  <div style="margin-bottom:36px;">
    ${sectionHead("08", "High-Priority Inbox Items", false)}
    <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;margin-bottom:12px;">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#BA7517;margin-bottom:10px;font-weight:500;">@info Inbox</div>
      ${(d.infoRows && d.infoRows.length) ? table(["From","Subject","Summary","Action + Owner"], d.infoRows) : '<p style="color:#7A6952;font-size:12px;font-style:italic;">No items.</p>'}
    </div>
    <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#BA7517;margin-bottom:10px;font-weight:500;">@eds Inbox</div>
      ${(d.edsRows && d.edsRows.length) ? table(["From","Subject","Summary","Action + Owner"], d.edsRows) : '<p style="color:#7A6952;font-size:12px;font-style:italic;">No items.</p>'}
    </div>
  </div>

  <!-- 09 Podcast -->
  <div style="margin-bottom:36px;">
    ${sectionHead("09", "Podcast Info & Performance", false)}
    <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
        ${kv([["Podcast", d.podName], ["Platform", d.podPlatform], ["Downloads (7-day)", d.pod7d], ["Downloads (30-day)", d.pod30d], ["All-Time Downloads", d.podAlltime], ["Top Listener App", d.podTopApp]])}
      </div>
      <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
        <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#7A6952;margin-bottom:10px;">Upcoming Episode</div>
        ${kv([["Topic", d.podUpTopic], ["Guest", d.podUpGuest], ["Record Date", d.podUpRecord], ["Publish Date", d.podUpPublish], ["Promo Plan", d.podUpPromo]])}
      </div>
    </div>
    ${(d.episodeRows && d.episodeRows.length) ? `
    <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;margin-top:12px;">
      <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#7A6952;margin-bottom:10px;">Recent Episodes</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead><tr>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Title</th>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Publish Date</th>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Downloads</th>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Link</th>
        </tr></thead>
        <tbody>${d.episodeRows.map(r => `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${safe(r.title)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${safe(r.date)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${safe(r.downloads)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${r.link && r.link !== "—" ? `<a href="${safe(r.link)}" style="color:#BA7517;">Listen →</a>` : "—"}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>` : ""}
  </div>

  <!-- 10 Coupons -->
  <div style="margin-bottom:36px;">
    ${sectionHead("10", "Coupon Codes", false)}
    <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;">
      ${(d.couponRows && d.couponRows.length) ? `
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead><tr>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Code</th>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Discount</th>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Times Used</th>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Expiry</th>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Notes</th>
        </tr></thead>
        <tbody>${d.couponRows.map(r => `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;"><code style="font-family:monospace;letter-spacing:.05em;background:#F2EBE0;padding:2px 6px;border-radius:4px;">${safe(r.code)}</code></td>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${safe(r.discount)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${safe(r.used)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${safe(r.expiry)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${safe(r.notes)}</td>
        </tr>`).join("")}</tbody>
      </table>` : '<p style="color:#7A6952;font-size:12px;font-style:italic;">No coupon codes entered.</p>'}
    </div>
  </div>

  <!-- Notes & Actions -->
  <div style="margin-bottom:36px;">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid #DDD4C4;">
      <span style="background:#1C1208;color:#F0DEB0;font-size:11px;font-weight:500;padding:3px 9px;border-radius:4px;letter-spacing:.08em;">✦</span>
      <span style="font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:400;color:#1C1208;">Notes & Priority Actions</span>
    </div>
    ${(d.actionRows && d.actionRows.length) ? `
    <div style="background:white;border:1px solid #DDD4C4;border-radius:10px;padding:20px 24px;margin-bottom:12px;">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead><tr>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Action Item</th>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Owner</th>
          <th style="text-align:left;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A6952;padding:7px 10px;border-bottom:1px solid #DDD4C4;font-weight:500;background:#F2EBE0;">Due</th>
        </tr></thead>
        <tbody>${d.actionRows.map(r => `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${safe(r.action)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;"><span style="background:#FAF0DC;color:#6B4400;display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;">${safe(r.owner)}</span></td>
          <td style="padding:8px 10px;border-bottom:1px solid #F2EBE0;">${safe(r.due)}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>` : ""}
    ${d.notesGeneral && d.notesGeneral !== "—" ? `
    <div style="background:#E8EDE2;border:1px solid #D0D9C8;border-radius:10px;padding:20px 24px;">
      <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B7A5E;margin-bottom:8px;">General Notes</div>
      <div style="font-size:13px;white-space:pre-wrap;">${safe(d.notesGeneral)}</div>
    </div>` : ""}
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:32px 0 16px;font-size:11px;color:#7A6952;letter-spacing:.06em;border-top:1px solid #DDD4C4;margin-top:40px;">
    AURELIA HEALTH &nbsp;·&nbsp; DAILY EXECUTIVE BRIEF &nbsp;·&nbsp; ${safe(d.dateDisplay)}
    ${notionPowered ? "&nbsp;·&nbsp; Patient data via Notion" : ""}
  </div>

</div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
  return res.status(200).send(html);
}

function notFoundPage(id) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Brief Not Found</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
</head><body style="background:#FAF7F2;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <div style="text-align:center;padding:40px;">
    <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:#1C1208;margin-bottom:8px;">Aurelia Health</div>
    <div style="font-size:14px;color:#7A6952;margin-bottom:24px;">No brief found for <strong>${id}</strong>.</div>
    <a href="/" style="background:#BA7517;color:#1C1208;padding:10px 22px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:500;">← Go to Brief Generator</a>
  </div>
</body></html>`;
}
