$basePath = "e:\Craft soft\Website"

# 1. Fix Admin Pages
$adminFiles = Get-ChildItem -Path "$basePath\acs_subdomains\acs_admin" -Include *.html,*.js -Recurse
foreach ($file in $adminFiles) {
    $content = Get-Content $file.FullName -Raw
    # Normalize paths: remove any /assets/admin/admin/ or similar
    $newContent = $content -replace '/assets/admin/admin/', '/assets/admin/'
    $newContent = $newContent -replace '/assets/admin/assets/', '/assets/admin/'
    
    # Ensure all asset paths start with /assets/admin/
    # (Matches src="./assets/", src="/assets/", but NOT src="/assets/admin/")
    $newContent = $newContent -replace 'src="\./assets/', 'src="/assets/admin/'
    $newContent = $newContent -replace 'href="\./assets/', 'href="/assets/admin/'
    
    if ($content -ne $newContent) {
        Set-Content $file.FullName $newContent
        Write-Host "Cleaned Admin: $($file.FullName)"
    }
}

# 2. Fix Signup Pages (Signup uses Admin assets)
$signupFiles = Get-ChildItem -Path "$basePath\acs_subdomains\acs_signup" -Include *.html,*.js -Recurse
foreach ($file in $signupFiles) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace '/assets/admin/admin/', '/assets/admin/'
    $newContent = $newContent -replace '/assets/admin/assets/', '/assets/admin/'
    $newContent = $newContent -replace '/assets/student/student/', '/assets/student/'
    
    $newContent = $newContent -replace 'src="\./assets/', 'src="/assets/admin/'
    $newContent = $newContent -replace 'href="\./assets/', 'href="/assets/admin/'
    
    # Special fix for specific files mentioned in user report
    $newContent = $newContent -replace '/assets/admin/admin/', '/assets/admin/'
    
    if ($content -ne $newContent) {
        Set-Content $file.FullName $newContent
        Write-Host "Cleaned Signup: $($file.FullName)"
    }
}

# 3. Fix Student Pages
$studentFiles = Get-ChildItem -Path "$basePath\acs_subdomains\acs_students" -Include *.html,*.js -Recurse
foreach ($file in $studentFiles) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace '/assets/student/student/', '/assets/student/'
    $newContent = $newContent -replace '/assets/student/admin/js/', '/assets/student/js/'
    
    $newContent = $newContent -replace 'src="\./assets/', 'src="/assets/student/'
    $newContent = $newContent -replace 'href="\./assets/', 'href="/assets/student/'
    
    if ($content -ne $newContent) {
        Set-Content $file.FullName $newContent
        Write-Host "Cleaned Student: $($file.FullName)"
    }
}
