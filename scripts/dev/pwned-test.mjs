// Checks the breached-password lookup against a local fake of the Have I Been Pwned range API.
import http from "node:http";
import crypto from "node:crypto";
import { isPwned } from "../../lib/pwned.js";
let fails = 0;
const ok = (c, n) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); if (!c) fails++; };
const bad = "Password123!x";
const sha = crypto.createHash("sha1").update(bad).digest("hex").toUpperCase();
let lastUrl = "";
const srv = http.createServer((req, res) => {
  lastUrl = req.url;
  if (req.url.startsWith("/down/")) { res.statusCode = 503; return res.end("no"); }
  if (req.url.startsWith("/slow/")) return; // never answers
  res.end(`0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n${sha.slice(5)}:42\r\n00D4F6E8FA6EECAD2A3AA415EEC418D38EC:0`);
}).listen(0);
await new Promise((r) => srv.on("listening", r));
const base = `http://127.0.0.1:${srv.address().port}`;
ok(await isPwned(bad, { url: base + "/range/" }) === true, "a breached password is caught");
ok(lastUrl === "/range/" + sha.slice(0, 5), "only the first 5 hash characters are sent");
ok(await isPwned("correct horse battery staple 19!", { url: base + "/range/" }) === false, "a clean password passes");
ok(await isPwned(bad, { url: base + "/down/" }) === false, "service error lets the password through");
ok(await isPwned(bad, { url: base + "/slow/", timeoutMs: 300 }) === false, "timeout lets the password through");
ok(await isPwned(bad, { url: "http://127.0.0.1:1/" }) === false, "unreachable service lets the password through");
srv.close();
process.exit(fails ? 1 : 0);
