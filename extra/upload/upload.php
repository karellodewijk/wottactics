<?php
require_once  "bulletproof.php";

function generateRandomString($length = 10) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
}

$image = new Bulletproof\Image($_FILES);
$image->setLocation("files");
$image->setSize(1, 10000000);
$image->setDimension(4096, 4096); 

if($image["pictures"]){
    $image->setName(generateRandomString());
    $upload = $image->upload(); 

    if($upload){
        echo '{"status":"OK", "path":"http://'.$_SERVER['HTTP_HOST'].'/upload/'.$image->getFullPath().'"}';
    }else{
        echo $image["error"]; 
    }
}
?>
