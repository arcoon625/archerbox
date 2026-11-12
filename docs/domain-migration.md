# Domain migration notes

Domain: archer-box.com. Registration stays at Squarespace; DNS moves to Cloudflare Free.

Assigned nameservers (saved at Squarespace):
- jessica.ns.cloudflare.com
- viddy.ns.cloudflare.com

Squarespace DNSSEC was disabled with owner approval before nameserver replacement. Cloudflare DNSSEC was enabled and its DS record was saved at Squarespace: key tag 2371, algorithm 13, digest type 2, digest 04CA94B5F4AA96A94374A01BD4E0C4AC629F65A05E45AF0326D0A7CAA8AEFF76. Verification follows DNS propagation.

## Previous Squarespace website defaults

These public DNS values were removed with owner approval and replaced with the Worker-managed archer-box.com and www.archer-box.com domains:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 198.185.159.144 |
| A | @ | 198.185.159.145 |
| A | @ | 198.49.23.144 |
| A | @ | 198.49.23.145 |
| CNAME | www | ext-sq.squarespace.com |

The _domainconnect CNAME and the three email-security TXT records (SPF, DMARC and empty DKIM) were imported into Cloudflare. No active email MX records were configured at Squarespace.

Cookies and local browser saves belong to a website origin. Prefer the final archer-box.com address for lasting player profiles; profiles from the temporary workers.dev address do not transfer automatically.
