// Copied from https://github.com/jgautheron/aws-serverless-express-edge, but because of this issue:
// https://github.com/jgautheron/aws-serverless-express-edge/issues/3
// I just copied the source and adjusted.

'use strict'
const http = require('http')
const url = require('url')
const zlib = require('zlib')
const binarycase = require('binary-case')
const qs = require('qs')

function getPathWithQueryStringParams(event) {
    const request = event.Records[0].cf.request
    return url.format({ pathname: request.uri, query: qs.parse(request.querystring) })
}

function getContentType(params) {
    // only compare mime type; ignore encoding part
    return params.contentTypeHeader ? params.contentTypeHeader.split(';')[0] : ''
}

function isContentTypeBinaryMimeType(params) {
    return params.binaryMimeTypes.indexOf(params.contentType) !== -1
}

function mapEdgeEventToHttpRequest(event, context, socketPath) {
    const request = event.Records[0].cf.request
    const headers = request.headers || {} // NOTE: Mutating event.headers; prefer deep clone of event.headers
    const eventWithoutBody = Object.assign({}, event)
    headers.host = headers.host[0].value;
    delete eventWithoutBody.body

    headers['x-edge-event'] = encodeURIComponent(JSON.stringify(eventWithoutBody))
    headers['x-edge-context'] = encodeURIComponent(JSON.stringify(context))

    return {
        method: request.method,
        path: getPathWithQueryStringParams(event),
        headers,
        socketPath,
    }
}

function forwardResponseToEdge(server, response, context) {
    let buf = []

    response
        .on('data', (chunk) => buf.push(chunk))
        .on('end', () => {
            const bodyBuffer = Buffer.concat(buf)
            const status = response.statusCode
            let headers = response.headers

            // chunked transfer not currently supported by API Gateway
            if (headers['transfer-encoding'] === 'chunked') delete headers['transfer-encoding']

            // Blacklisted / read-only headers
            if (headers.hasOwnProperty('connection')) delete headers['connection']
            if (headers.hasOwnProperty('content-length')) delete headers['content-length']

            const contentType = getContentType({ contentTypeHeader: headers['content-type'] })

            let body
            let isBase64Encoded = isContentTypeBinaryMimeType({ contentType, binaryMimeTypes: server._binaryTypes })
            switch (contentType) {
                case 'text/html':
                    body = zlib.gzipSync(bodyBuffer).toString('base64')
                    isBase64Encoded = true
                    headers['content-encoding'] = 'gzip'
                    break
                default:
                    body = bodyBuffer.toString(isBase64Encoded ? 'base64' : 'utf8')
            }

            Object.keys(headers)
                .forEach(h => {
                    headers[h] = [{ key: h, value: headers[h] }]
                })

            const successResponse = { status, body, headers }
            if (isBase64Encoded) {
                successResponse.bodyEncoding = 'base64'
            }

            context.succeed(successResponse)
        })
}

function forwardConnectionErrorResponseToEdge(server, error, context) {
    console.log('ERROR: aws-serverless-express-edge connection error')
    console.error(error)
    const errorResponse = {
        status: '502', // "DNS resolution, TCP level errors, or actual HTTP parse errors" - https://nodejs.org/api/http.html#http_http_request_options_callback
        body: '',
        headers: {}
    }

    context.succeed(errorResponse)
}

function forwardLibraryErrorResponseToEdge(server, error, context) {
    console.log('ERROR: aws-serverless-express-edge error')
    console.error(error)
    const errorResponse = {
        status: '500',
        body: '',
        headers: {}
    }

    context.succeed(errorResponse)
}

function forwardRequestToNodeServer(server, event, context) {
    try {
        const requestOptions = mapEdgeEventToHttpRequest(event, context, getSocketPath(server._socketPathSuffix))
        const req = http.request(requestOptions, (response, body) => forwardResponseToEdge(server, response, context))
        if (event.body) {
            if (event.bodyEncoding === 'base64') {
                event.body = new Buffer(event.body, 'base64')
            }

            req.write(event.body)
        }

        req.on('error', (error) => forwardConnectionErrorResponseToEdge(server, error, context))
            .end()
    } catch (error) {
        forwardLibraryErrorResponseToEdge(server, error, context)
        return server
    }
}

function startServer(server) {
    return server.listen(getSocketPath(server._socketPathSuffix))
}

function getSocketPath(socketPathSuffix) {
    return `/tmp/server${socketPathSuffix}.sock`
}

function createServer(requestListener, serverListenCallback, binaryTypes) {
    const server = http.createServer(requestListener)

    server._socketPathSuffix = 0
    server._binaryTypes = binaryTypes ? binaryTypes.slice() : []
    server.on('listening', () => {
        server._isListening = true

        if (serverListenCallback) serverListenCallback()
    })
    server.on('close', () => {
        server._isListening = false
    })
        .on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.warn(`WARNING: Attempting to listen on socket ${getSocketPath(server._socketPathSuffix)}, but it is already in use. This is likely as a result of a previous invocation error or timeout. Check the logs for the invocation(s) immediately prior to this for root cause, and consider increasing the timeout and/or cpu/memory allocation if this is purely as a result of a timeout. aws-serverless-express-edge will restart the Node.js server listening on a new port and continue with this request.`)
                ++server._socketPathSuffix
                return server.close(() => startServer(server))
            }

            console.log('ERROR: server error')
            console.error(error)
        })

    return server
}

function proxy(server, event, context) {
    if (server._isListening) {
        forwardRequestToNodeServer(server, event, context)
        return server
    } else {
        return startServer(server)
            .on('listening', () => proxy(server, event, context))
    }
}

exports.createServer = createServer
exports.proxy = proxy

if (process.env.NODE_ENV === 'test') {
    exports.getPathWithQueryStringParams = getPathWithQueryStringParams
    exports.mapEdgeEventToHttpRequest = mapEdgeEventToHttpRequest
    exports.forwardResponseToEdge = forwardResponseToEdge
    exports.forwardConnectionErrorResponseToEdge = forwardConnectionErrorResponseToEdge
    exports.forwardLibraryErrorResponseToEdge = forwardLibraryErrorResponseToEdge
    exports.forwardRequestToNodeServer = forwardRequestToNodeServer
    exports.startServer = startServer
    exports.getSocketPath = getSocketPath
}
