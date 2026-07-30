import fs from "node:fs";

const root = new URL("../", import.meta.url);
const preRoll = 3;

function chaptersFrom(file) {
  const html = fs.readFileSync(new URL(file, root), "utf8");
  const match = html.match(
    /<script type="application\/json" id="allChapters">([\s\S]*?)<\/script>/
  );
  if (!match) throw new Error(`Missing chapter data in ${file}`);
  return JSON.parse(match[1]).chapters;
}

function normalize(callout, groups) {
  const adjusted = { ...callout };
  for (let index = 1; index < groups.length; index++) {
    const cardTime = groups[index].triggerTime;
    if (adjusted.start >= cardTime || adjusted.end < cardTime) continue;
    const startsRightBeforeCard = cardTime - adjusted.start <= preRoll;
    if (startsRightBeforeCard && adjusted.end > cardTime) {
      adjusted.start = cardTime;
      adjusted.action = "deferred";
    } else {
      adjusted.end = Math.max(adjusted.start, cardTime - 0.01);
      adjusted.action = "closed-before-card";
    }
  }
  return adjusted;
}

const changes = [];
for (const moduleFile of ["module1.html", "module2.html"]) {
  for (const chapter of chaptersFrom(moduleFile)) {
    const groups = chapter.vbData.groups;
    for (const callout of chapter.player.callouts || []) {
      const adjusted = normalize(callout, groups);
      if (adjusted.start !== callout.start || adjusted.end !== callout.end) {
        changes.push({
          lesson: `${moduleFile.replace(".html", "")} part ${chapter.n}`,
          title: callout.title,
          action: adjusted.action,
          oldStart: callout.start,
          newStart: adjusted.start,
          oldEnd: callout.end,
          newEnd: adjusted.end,
        });
      }
      for (const group of groups.slice(1)) {
        const crossesCard =
          adjusted.start < group.triggerTime && adjusted.end >= group.triggerTime;
        if (crossesCard) {
          throw new Error(
            `${moduleFile} part ${chapter.n}: "${callout.title}" crosses ${group.triggerTime}`
          );
        }
      }
    }
  }
}

const player = fs.readFileSync(new URL("player.js", root), "utf8");
const css = fs.readFileSync(new URL("player.css", root), "utf8");
if (!player.includes("if (introCardArmed) clearBulletsAndListsForTitleCard();")) {
  throw new Error("Opening-card list lock is missing");
}
if (!player.includes("Math.ceil(titleCardFadeDurationMs()) + 50")) {
  throw new Error("Full-fade reveal delay is missing");
}
if (
  !/body\.title-card-active \.video-callout[\s\S]*?visibility:\s*hidden !important/.test(css)
) {
  throw new Error("Callout heading/list visibility lock is missing");
}
if (
  !/body\.title-card-active \.bul-inner \.sec-hdr[\s\S]*?opacity:\s*0;[\s\S]*?visibility:\s*hidden/.test(css)
) {
  throw new Error("Sidebar heading visibility lock is missing");
}

console.log(JSON.stringify({ passed: true, adjustedCallouts: changes }, null, 2));
