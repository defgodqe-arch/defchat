#include "raylib.h"
#include <algorithm>
#include <cmath>
#include <string>
#include <vector>

// Solarbound: a compact, original 2D platformer. Built with raylib.
// Levels are generated deterministically; level 1000 is the Sun Warrior boss arena.
struct Platform { float x, y, w, h; };
struct Coin { Vector2 p; bool taken = false; };
struct Enemy { float x, y, left, right, speed; bool alive = true; };
struct Player { float x=70, y=250, vx=0, vy=0; bool grounded=false; int hp=3; };
static constexpr int SW=1120, SH=680;
static constexpr float GRAVITY=1550.0f;

static float groundY(int level, int segment) {
    return 510.0f + std::sin(float(level*13+segment)*0.63f)*38.0f;
}
static std::vector<Platform> makePlatforms(int level) {
    std::vector<Platform> out;
    out.push_back({0, 565, 360, 115});
    for (int i=1;i<9;i++) {
        float x=260.0f+i*225.0f;
        float y=groundY(level,i);
        float width=(i%3==0)?150.0f:118.0f;
        out.push_back({x,y,width,22});
        if(i%2==0) out.push_back({x+55,y-115.0f,92,18});
    }
    out.push_back({2100,565,420,115});
    return out;
}
int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_VSYNC_HINT);
    InitWindow(SW,SH,"Solarbound - Cinder Mini-game");
    SetTargetFPS(60);
    Player p;
    int level=1, coins=0, lives=3;
    float cameraX=0, bossHp=100, bossX=780, bossTimer=0, invuln=0;
    bool bossFight=false, victory=false, gameOver=false;
    std::vector<Platform> platforms=makePlatforms(level);
    std::vector<Coin> loot;
    std::vector<Enemy> enemies;
    auto resetLevel=[&](){
        p.x=70;p.y=250;p.vx=0;p.vy=0;p.grounded=false;
        platforms=makePlatforms(level);loot.clear();enemies.clear();
        for(int i=0;i<8;i++) loot.push_back({{320.0f+i*225.0f,groundY(level,i+1)-48.0f},false});
        for(int i=0;i<5;i++){float x=470.0f+i*330.0f;enemies.push_back({x,groundY(level,i+2)-32,x-65,x+65,65.0f+(level%9)*4.0f,true});}
        bossFight=(level==1000); if(bossFight){bossHp=100;bossX=780;bossTimer=0;loot.clear();enemies.clear();}
    };
    resetLevel();
    while(!WindowShouldClose()) {
        float dt=std::min(GetFrameTime(),0.033f);
        if(IsKeyPressed(KEY_R)){level=1;coins=0;lives=3;victory=false;gameOver=false;resetLevel();}
        if(!gameOver&&!victory) {
            invuln=std::max(0.0f,invuln-dt);
            float axis=0;
            if(IsKeyDown(KEY_A)||IsKeyDown(KEY_LEFT))axis-=1;
            if(IsKeyDown(KEY_D)||IsKeyDown(KEY_RIGHT))axis+=1;
            p.vx=axis*285.0f;
            if((IsKeyPressed(KEY_SPACE)||IsKeyPressed(KEY_W)||IsKeyPressed(KEY_UP))&&p.grounded){p.vy=-610.0f;p.grounded=false;}
            p.vy+=GRAVITY*dt;
            float oldY=p.y;
            p.x+=p.vx*dt;p.y+=p.vy*dt;
            p.x=std::max(0.0f,p.x);
            p.grounded=false;
            for(const auto& plat:platforms) {
                Rectangle r{plat.x,plat.y,plat.w,plat.h};
                Rectangle feet{p.x+5,oldY+24,24,7};
                Rectangle now{p.x+5,p.y+24,24,7};
                if(p.vy>=0&&CheckCollisionRecs(now,r)&&feet.y+feet.height<=plat.y+10){p.y=plat.y-24;p.vy=0;p.grounded=true;}
            }
            if(p.y>SH+80){lives--;if(lives<=0)gameOver=true;else resetLevel();}
            for(auto& c:loot)if(!c.taken&&CheckCollisionCircles({p.x+17,p.y+12},17,c.p,13)){c.taken=true;coins++;}
            for(auto& e:enemies)if(e.alive){
                e.x+=e.speed*dt*(std::sin(GetTime()+e.x)*0.15f+1.0f);
                if(e.x<e.left||e.x>e.right)e.speed=-e.speed;
                Rectangle er{e.x,e.y,30,30},pr{p.x,p.y,34,34};
                if(CheckCollisionRecs(er,pr)&&invuln<=0){
                    if(p.vy>100&&p.y+30<e.y+12){e.alive=false;p.vy=-360;coins+=2;}
                    else {lives--;invuln=1.1f;if(lives<=0)gameOver=true;}
                }
            }
            if(bossFight) {
                bossTimer+=dt;bossX=660+std::sin(bossTimer*1.1f)*170;
                Rectangle br{bossX,350,110,145},pr{p.x,p.y,34,34};
                if(CheckCollisionRecs(br,pr)&&invuln<=0){lives--;invuln=1.0f;if(lives<=0)gameOver=true;}
                if(IsKeyPressed(KEY_X)&&std::abs((p.x+17)-(bossX+55))<180&&std::abs(p.y-390)<210)bossHp-=12;
                if(bossHp<=0)victory=true;
            } else if(p.x>2200) {
                level=std::min(1000,level+1);
                if(level==1000){p.x=80;p.y=350;} resetLevel();
            }
            cameraX=std::max(0.0f,p.x-SW*0.32f);
        }
        BeginDrawing();
        ClearBackground(Color{15,18,43,255});
        // sunset sky and distant mountains
        DrawRectangleGradientV(0,0,SW,SH,Color{24,28,67,255},Color{80,44,67,255});
        for(int i=0;i<14;i++){float x=float(i*125)-std::fmod(cameraX*0.18f,125.0f);DrawTriangle({x,450},{x+80,285.0f+(i%4)*22},{x+170,450},Color{44,44,83,255});}
        DrawCircle(SW-145,105,47,Color{255,194,70,255});DrawCircle(SW-145,105,61,Color{255,177,55,45});
        Camera2D cam{{SW/2.0f,SH/2.0f},{p.x-cameraX,p.y+20},0,1};
        BeginMode2D(cam);
        for(const auto& plat:platforms){DrawRectangleRec({plat.x,plat.y,plat.w,plat.h},Color{45,90,75,255});DrawRectangle(int(plat.x),int(plat.y),int(plat.w),5,Color{105,201,124,255});}
        for(const auto& c:loot)if(!c.taken){DrawCircleV(c.p,12,Color{255,218,83,255});DrawCircleV(c.p,5,Color{255,248,187,255});}
        for(const auto& e:enemies)if(e.alive){DrawRectangle(int(e.x),int(e.y),30,30,Color{104,70,139,255});DrawCircle(int(e.x+9),int(e.y+10),3,RAYWHITE);DrawCircle(int(e.x+21),int(e.y+10),3,RAYWHITE);}
        // hero
        if(invuln<=0||int(GetTime()*12)%2==0){DrawRectangleRounded({p.x,p.y,34,34},0.28f,5,Color{255,199,61,255});DrawCircle(int(p.x+11),int(p.y+12),3,Color{35,27,31,255});DrawCircle(int(p.x+24),int(p.y+12),3,Color{35,27,31,255});DrawRectangle(int(p.x+10),int(p.y+23),14,3,Color{35,27,31,255});}
        if(bossFight){
            DrawCircle(int(bossX+55),int(422+std::sin(GetTime()*2)*9),72,Color{255,112,36,60});
            DrawRectangleRounded({bossX,350,110,145},0.2f,8,Color{190,74,36,255});
            DrawCircle(int(bossX+55),382,35,Color{255,205,80,255});DrawCircle(int(bossX+44),378,5,Color{62,25,22,255});DrawCircle(int(bossX+66),378,5,Color{62,25,22,255});
            DrawTriangle({bossX+8,355},{bossX+22,315},{bossX+39,355},Color{255,206,83,255});DrawTriangle({bossX+72,355},{bossX+91,315},{bossX+102,355},Color{255,206,83,255});
        }
        EndMode2D();
        DrawRectangle(18,18,330,88,Color{10,12,27,205});DrawText(TextFormat("LEVEL %d / 1000",level),32,29,22,Color{255,211,92,255});DrawText(TextFormat("SUN COINS: %d",coins),32,58,17,RAYWHITE);DrawText(TextFormat("LIVES: %d",lives),210,58,17,RAYWHITE);
        DrawText("MOVE: A/D or arrows   JUMP: SPACE   R: restart",20,SH-31,16,Color{244,224,192,255});
        if(bossFight){DrawText("SUN WARRIOR",SW/2-94,20,24,Color{255,198,78,255});DrawRectangle(SW/2-150,52,300,17,Color{60,24,26,255});DrawRectangle(SW/2-150,52,int(300*std::max(0.0f,bossHp)/100.0f),17,Color{255,111,46,255});DrawText("Press X near the Sun Warrior to strike",SW/2-160,77,15,RAYWHITE);}
        if(gameOver||victory){DrawRectangle(0,0,SW,SH,Color{5,7,18,210});const char* title=victory?"THE SUN WARRIOR IS DEFEATED": "THE LIGHT FADES";DrawText(title,SW/2-MeasureText(title,34)/2,SH/2-38,34,Color{255,211,92,255});const char* sub=victory?"You conquered all 1000 levels. Press R to play again.":"Out of lives. Press R to restart your journey.";DrawText(sub,SW/2-MeasureText(sub,18)/2,SH/2+12,18,RAYWHITE);}
        EndDrawing();
    }
    CloseWindow();
    return 0;
}
