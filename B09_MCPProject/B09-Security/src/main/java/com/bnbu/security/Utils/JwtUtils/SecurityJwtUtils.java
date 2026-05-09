package com.bnbu.security.Utils.JwtUtils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;

@Component
public class SecurityJwtUtils {

    private static final String signature = "====ThisIsAGroupProjectByB09====";
    public String generateToken(String userId, List<String> roles){
        return Jwts.builder()
                .header()
                .add("type","JWT")
                .add("algorithm","HS256")
                .and()
                .subject(userId)
                .issuer("MCPMS_B09")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis()+ 1000 * 60 * 60 * 2))
                .claim("userId", userId)
                .claim("roles",roles)
                .signWith(Keys.hmacShaKeyFor(signature.getBytes()))
                .compact();

    }

    public static List<String> getRolesFromToken(String token){
        Claims claims = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(signature.getBytes()))
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.get("roles",List.class);

    }

    public static String getUserIdFromToken(String token) {
       Claims claims = Jwts.parser()
               .verifyWith(Keys.hmacShaKeyFor(signature.getBytes()))
               .build()
               .parseSignedClaims(token)
               .getPayload();
       return claims.get("userId",String.class);
    }

    public Claims parseToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(Keys.hmacShaKeyFor(signature.getBytes()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Token has expired，please login again");
        } catch (JwtException e) {
            throw new RuntimeException("Token is invalid");
        }
    }
}
