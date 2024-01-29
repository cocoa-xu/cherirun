<h1><a href="https://cheri.run" target="_blank"><img src="https://github.com/cocoa-xu/cherirun/raw/main/assets/repository-open-graph.png" alt="Logo"></a></h1>

[cheri.run](https://cheri.run) runs a [CheriBSD](https://cheribsd.org) virtual machine on the cloud for easy access to everyone as a playground for experimenting with [CHERI](https://www.cl.cam.ac.uk/research/security/ctsrd/cheri/) and [Morello](https://www.arm.com/architecture/cpu/morello).

## Notice
> [!IMPORTANT]
> - The host server resets every 12 hours at 00:00 and 12:00 UTC+0.

> [!IMPORTANT]
> Pasting multi lines of code will cause the terminal to freeze. Please paste one line at a time or using GitHub gist or pastebin or eqvilent services.
> 
> - [GitHub gist](https://gist.github.com/)
> - [Pastebin](https://pastebin.com/)
>
> Another way is to use `tmate` to get a shared terminal session.
>
> ```bash
> # Install tmate
> # use `pkg` if you are running hybird cheribsd
> $ pkg64 install -y tmate
> Updating CheriBSD repository catalogue...
> Fetching meta.conf:   0%
> CheriBSD repository is up to date.
> All repositories are up to date.
> Checking integrity... done (0 conflicting)
> The following 1 package(s) will be affected (of 0 checked):
> 
> New packages to be INSTALLED:
>        tmate: 2.4.0_3
>
> Number of packages to be installed: 1
> [1/1] Installing tmate-2.4.0_3...
> [1/1] Extracting tmate-2.4.0_3: 100%      5 B   0.0kB/s    00:01    
> =====
> Message from tmate-2.4.0_3:
> 
> --
> When trying to connect to the default public tmate server it may happpen that
> the following errors messages will be printed:
>
>  Connecting to ssh.tmate.io...
>  Cannot authenticate server
>  Reconnecting... (Cannot authenticate server)
>
> This is because the fingerprints of the default tmate server keys are stripped
> out from the tmate binary.
>
> Instead, users are encouraged to specify the fingerprints via ~/.tmate.conf, e.g.:
>
>  set -g tmate-server-rsa-fingerprint   "SHA256:Hthk2T/M/Ivqfk1YYUn5ijC2Att3+UPzD7Rn72P5VWs"
>  set -g tmate-server-ecdsa-fingerprint "SHA256:8GmKHYHEJ6n0TEdciHeEGkKOigQfCFuBULdt6vZIhDc"
> $ cat <<EOF > ~/.tmate.conf
> set -g tmate-server-rsa-fingerprint   "SHA256:Hthk2T/M/Ivqfk1YYUn5ijC2Att3+UPzD7Rn72P5VWs"
> set -g tmate-server-ecdsa-fingerprint "SHA256:8GmKHYHEJ6n0TEdciHeEGkKOigQfCFuBULdt6vZIhDc"
> EOF
> $ tmate
> ```

Please remember to specify the fingerprints in `~/.tmate.conf` on the CheriBSD VM before using `tmate`, otherwise
it's highly likely that you won't be able to connect to the server. The fingerprints shown above are example only 
and subject to change, please use the ones shown in your terminal.
