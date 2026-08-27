const requestError = (res) => {
    if (res.ok) return null
    if (res.status === 401) return 'Unauthorized — the server token may have expired. Update it in the server settings.'
    return 'Request failed (' + res.status + ')'
}

export default requestError
