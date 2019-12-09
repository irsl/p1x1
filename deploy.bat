@ECHO OFF
set PATH=%PATH%;"C:\Users\John Doe\AppData\Local\Atlassian\SourceTree\git_local\mingw32\libexec\git-core"
node node_modules\@angular\cli\bin\ng build --prod --base-href https://irsl.github.io/p1x1/

del /F /Q gh-pages\*.js gh-pages\*.html gh-pages\*.png gh-pages\assets\js\*.* gh-pages\*.gif gh-pages\*.eot gh-pages\*.woff2 gh-pages\*.txt gh-pages\*.ttf gh-pages\*.svg gh-pages\*.css gh-pages\*.woff
xcopy dist\p1x1 gh-pages /E
cd gh-pages
git add .
git commit -m "deploy"
git push
cd ..
