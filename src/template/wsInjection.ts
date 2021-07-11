export default `
<script>
  let devSocket;
  const connectDevServer = () => {
    devSocket = new WebSocket('ws://localhost:<port>');
    devSocket.addEventListener('open', () => {
      console.log('Connected to preview server socket.');
      devSocket.addEventListener('message', (event) => {
        if (event.data === 'refresh-page') {
          window.location.reload();
        }
      });
    });
    devSocket.addEventListener('error', (event) => {
      console.error('Error occured when communicating with preview server.', event);
    });
    devSocket.addEventListener('close', () => {
      console.warn('Disconnect from preview server.');
      devSocket = null;
      setTimeout(() => {
        connectDevServer();
      }, 1000);
    });
  }
  connectDevServer();
</script>
`;
