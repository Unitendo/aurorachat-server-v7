# AuroraChat V7 - Embed API #

## Embed messages ##

Embed messages are messages where the content is a URL to an embed.  
E.g. `http://someserver:7080/embed/embed-id-of-a-really-cool-image`

Embed messages CANNOT contain any other text besides the embed link itself.

## POST /embeds ##

Uploads an embed image to the server.

Headers:

- Authorization: `V7 login|password|`, where login and password are the V7-Encoded credentials of a user.
- Content-Type: either `image/png` or `image/gif`.

POST Body:

Raw PNG or GIF image data. Up to 1MB.

Responses:

- 200 - Embed uploaded successfully, response is an embed ID.
- 400 - Improper content type or data too large.
- 401 - Improper auth format or bad credentials.
- 403 - IP-Banned, or the user tied to the login is either banned or muted.

## GET /embeds/:embedid ##

Fetches an embed from the server.

Parameters:

- embedid - Embed ID of the target embed.

Responses:

- 200 - PNG or GIF data of embed. Content type is specified in the HTTP `Content-Type` Header.
- 403 - IP-Banned.
- 404 - Embed ID is invalid or embed has expired.

## GET /embeds/:embedid/info ##

Fetches information about an embed from the server.

Parameters:

- embedid - Embed ID of the target embed.

Responses:

- 200 - V7-Encoded Embed information. `eid|author|type|` EID is the embed ID, Author is the username of the uploader of the embed, type is the MIME type of the embed (either `image/png` or `image/gif`).
- 403 - IP-Banned.
- 404 - Embed ID is invalid or embed has expired.
