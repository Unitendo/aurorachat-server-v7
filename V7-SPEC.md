# Aurorachat V7 #

## Message structure ##

```txt
command|arg1|arg2...|\n

command: ASCII command, case insensitive (but normally lowercase), terminated via |, required

arg: Optional arguments, each argument is terminated with a | (including the last one), either ASCII or Unicode, URL-Encoded 

\n: ASCII newline character (0x0a), message terminator
```

## Client commands ##

- login|login|passwd| - Logs user in
- register|login|passwd| - Creates a user
- rules| - Gets server rules
- join|room| - Joins a room (Leaves any previous room)
- part| - Leaves current room
- history|optionalsize| - Gets message history for current room. Optionally a size parameter can be given, sending the last n bytes.
- msg|msg| - Sends message to current room

## Server responses ##

- hello|v7|servername| - Server greeting upon connection
- ipbanned| - Server greeting upon connection with IP-Banned client
- ok| - Command succeeded
- err|errcode| - Command failed, error code specified
- rules|rules| - Server rules
- msg|user|msg| - Message from user

## Error codes ##

- command_unknown - Specified command is not recognized by the server
- args_bad - Improper arguments specified or arguments missing
- user_exists - User already exists
- register_failure - User registration failed (most likely a bad username)
- bad_login - User login failed (a bad username or password)

## Example communication ##

Messages from the server are marked with `>`
Messages from the client are marked with `<`
Comments are marked with `#`

```v7
> hello|v7|Server Name|
# Server greeting
< login|myname|mysecurepassword|
> ok|
# Successful login
< rules|
> rules|These are the server rules%0aURL-Encoded, of course.|
# Client asks for server rules
< join|general|
# Client joins room general
< history|1024|
> msg|jakub|balls :3|
# Client requests 1024 bytes of room message history
> msg|jakub|This is V7|
> msg|3pm|Fancy message%0awith newlines|
> msg|orstando|segfault|
# Incoming messages from client on same room
< msg|Hello World!|
> msg|myname|Hello World!|
# Outgoing message to clients on room
```
