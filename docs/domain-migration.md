# Domain migration notes

Domain: archer-box.com. Registration stays at Squarespace; DNS moves to Cloudflare Free.

Assigned nameservers (saved at Squarespace):
- jessica.ns.cloudflare.com
- viddy.ns.cloudflare.com

Squarespace DNSSEC was disabled with owner approval before nameserver replacement. Re-enable DNSSEC through Cloudflare and publish its DS record at Squarespace after activation.

## Previous Squarespace website defaults

These are public DNS configuration values, recorded before replacement with Worker-managed domains:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 198.185.159.144 |
| A | @ | 198.185.159.145 |
| A | @ | 198.49.23.144 |
| A | @ | 198.49.23.145 |
| CNAME | www | ext-sq.squarespace.com |

The _domainconnect CNAME and the three email-security TXT records (SPF, DMARC and empty DKIM) were imported into Cloudflare. No active email MX records were configured at Squarespace.

Cookies and local browser saves belong to a website origin. Prefer the final archer-box.com address for lasting player profiles; profiles from the temporary workers.dev address do not transfer automatically.
