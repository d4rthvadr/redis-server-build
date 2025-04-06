### Notes on RESP (Redis serialization protocol specification)

Redis serialization protocol (RESP) is the wire protocol that clients implement

To communicate with the Redis server, Redis clients use a protocol called Redis Serialization Protocol (RESP). While the protocol was designed specifically for Redis, you can use it for other client-server software projects.

RESP is a compromise among the following considerations:

Simple to implement.
Fast to parse.
Human readable.

[Learn more about RESP in the official Redis documentation](https://redis.io/docs/reference/protocol-spec/)

#### Integers

This type is a CRLF-terminated string that represents a signed, base-10, 64 bit.
`:[<+|->]<value>\r\n`

- An optional plus (+) or minus (-) as the sign.
- One or more decimal digits (0..9) as the integer's unsigned base-10 value.
  For example, the output 1000 is encoded as below:

```shell
:1000\r\n
```

#### Bulk strings

A bulk string represents a single binary string. By default redis limit it to 512MB.
`$<length>\r\n<data>\r\n`
For example, the output "hello" is encoded as below:

```shell
$5\r\nhello\r\n
```

#### Null bulk strings

This represents a non-existing value. Eg GET command returns the Null bulk string when the target key does't exist.

```shell
$-1\r\n
```
