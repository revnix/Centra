git config --global user.name "Abdullah"
git config --global user.email abuk10977@gmail.com

git init

ls -Force
git status
git add index.html
git commit -m "Hey hello"
git log

get show --> File ma chnges dkhna k lia

<!-- Agr koi specific commit ki file dkhna chay to us k lia -->
git show commit unique id:file path

<!-- Agr ap koi purani file lana chty ho wps -->
git checkout 5f0a624a66bbe8264617b9b08e4c1f5a6927e690 -- index.html

<!-- agr ap phr sa latest wali file wpis lana chty ho -->
git checkout master -- *

<!-- Agr kuch galti etc hu gai file ma or usa back krna ha  -->
get restore . (. means all file, we can use index.html here)

<!-- agr ham na git add kr lia or galti b ki hui ho to phr yah use kryn gy -->
git restore --staged .
git restore .

<!-- agr git add krna k bad koi mistake hu jay to  -->
git git restore --worktree .

<!-- agr commit krna k bad pta chly k galti ki hu to usa asa reset kryn ga  -->
git reset --soft Head^
git reset --hard Head^

<!-- Useful logs option -->
<!-- agr last 2 commit dkhna hyn to -->
git log -p -2

<!-- Summary dikhay ga k kia kia changes hui hyn -->
git log --stat

<!-- agr har commit 1 line ma dkhna chty hyn to -->
git log --pretty=oneline

<!-- agr koi specific function dkhna chty hyn k yah kab change ya add hua like <h1> -->
git log -S "h1"

<!-- agr commit k message k zariya search krna chao to -->
git log --grep="v2"

<!-- agr ksi specific user ka commit dkhna ha to -->
git log --author="Abdullah khan"


<!-- Push from local to remote repo -->
git add
git commit -m "v3"
git push

<!-- Understand Git Pull -->
<!-- from remote repo to local  -->
git pull


<!-- Branching & Merging -->
<!-- Make a new branch -->
git branch new_branch(<--- name of branch)
git branch design
<!-- agr dusri branch par shift hona ho to -->
git checkout design

<!-- Merge two branches -->
git merge design  (<--- branch name design)

