const requestError = (res) => {
    if (res.ok) return null
    if (res.status === 401) return 'Unauthorized — the server token may have expired. Update it in the server settings.'
    return 'Request failed (' + res.status + ')'
}

export const networkError = 'Server not reachable — check the host and your network.'

export const pendingError = (err) => err && 'Change request is pending on the server — do not resubmit. ' + err

export const acceptError = (res) => pendingError(requestError(res))

export default requestError
