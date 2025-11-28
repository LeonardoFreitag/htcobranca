
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-23.11"; # Or "unstable"
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
  ];
  # Sets environment variables in the workspace
  env = {};
  # Fast way to start services in the terminal
  # and create previews in the side-by-side browser
  previews = [
    {
      command = "npm run dev -- --port $PORT --host 0.0.0.0";
      # Label for the browser tab
      label = "web";
      # On which port the server is listening
      port = 5173;
    },
    {
      # The emulators
      command = "firebase emulators:start";
      label = "emulators";
      port = 4000; # Port for the emulator UI
    }
  ];
  # Commands to run on workspace startup
  start = {
    # Installs packages, and then starts the web server
    web.command = "npm install && npm run dev";
  };
}
